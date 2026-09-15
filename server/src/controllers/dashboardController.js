const transactionRepo = require('../db/transactionRepo');
const userRepo = require('../db/userRepo');
const exchangeRateRepo = require('../db/exchangeRateRepo');
const {
  calculateNetSavings,
  calculateSavingsRate,
  Decimal,
} = require('../utils/money');

function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

/**
 * Convert a list of {currency, type, total} rows into totals expressed in
 * the target display currency. Any row whose currency cannot be converted
 * (no stored or fallback rate available) is excluded from the converted
 * total but reported separately so the UI can clearly flag it, rather than
 * silently treating 1 EUR as equal to 1 USD.
 */
async function convertRowsToDisplayCurrency(rows, displayCurrency, asOfDate) {
  let convertedTotal = new Decimal(0);
  const unconverted = [];
  const perCurrency = [];

  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const resolved = await exchangeRateRepo.resolveRate(row.currency, displayCurrency, asOfDate);
    perCurrency.push({ currency: row.currency, amount: row.total });
    if (resolved) {
      convertedTotal = convertedTotal.plus(new Decimal(row.total).times(resolved.rate));
    } else {
      unconverted.push(row.currency);
    }
  }
  return { convertedTotal: convertedTotal.toDecimalPlaces(2).toNumber(), unconverted, perCurrency };
}

async function summary(req, res, next) {
  try {
    const user = await userRepo.findById(req.userId);
    const displayCurrency = req.query.currency || user.default_currency;
    const today = new Date();
    const currentMonth = today.getUTCMonth() + 1;
    const currentYear = today.getUTCFullYear();
    const { startDate, endDate } = monthRange(currentYear, currentMonth);

    const allTimeRows = await transactionRepo.aggregateTotalsByCurrency(req.userId, {});
    const monthRows = await transactionRepo.aggregateTotalsByCurrency(req.userId, { startDate, endDate });

    const asOf = new Date().toISOString().slice(0, 10);

    const incomeAllTime = allTimeRows.filter((r) => r.type === 'INCOME');
    const expenseAllTime = allTimeRows.filter((r) => r.type === 'EXPENSE');
    const incomeMonth = monthRows.filter((r) => r.type === 'INCOME');
    const expenseMonth = monthRows.filter((r) => r.type === 'EXPENSE');

    const [incomeConv, expenseConv, incomeMonthConv, expenseMonthConv] = await Promise.all([
      convertRowsToDisplayCurrency(incomeAllTime, displayCurrency, asOf),
      convertRowsToDisplayCurrency(expenseAllTime, displayCurrency, asOf),
      convertRowsToDisplayCurrency(incomeMonth, displayCurrency, asOf),
      convertRowsToDisplayCurrency(expenseMonth, displayCurrency, asOf),
    ]);

    const totalIncome = incomeConv.convertedTotal;
    const totalExpenses = expenseConv.convertedTotal;
    const netSavings = calculateNetSavings(totalIncome, totalExpenses).toNumber();
    const savingsRate = calculateSavingsRate(totalIncome, totalExpenses);

    const recentTransactions = await transactionRepo.list(req.userId, {
      page: 1,
      pageSize: 8,
      sortBy: 'transactionDate',
      sortOrder: 'desc',
    });

    const topCategoriesRaw = await transactionRepo.categoryBreakdown(req.userId, {
      startDate,
      endDate,
      type: 'EXPENSE',
    });

    res.json({
      displayCurrency,
      anyUnconvertedCurrencies: [
        ...new Set([...incomeConv.unconverted, ...expenseConv.unconverted]),
      ],
      totals: {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate, // null when total income is 0 (undefined rate)
      },
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        income: incomeMonthConv.convertedTotal,
        expenses: expenseMonthConv.convertedTotal,
        netSavings: calculateNetSavings(incomeMonthConv.convertedTotal, expenseMonthConv.convertedTotal).toNumber(),
      },
      recentTransactions: recentTransactions.data,
      topSpendingCategories: topCategoriesRaw.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
}

async function incomeVsExpenses(req, res, next) {
  try {
    const months = req.query.months ? Number(req.query.months) : 12;
    const rows = await transactionRepo.monthlySeries(req.userId, months);
    res.json({ series: rows });
  } catch (err) {
    next(err);
  }
}

async function categoryDistribution(req, res, next) {
  try {
    const { startDate, endDate, type } = req.query;
    const rows = await transactionRepo.categoryBreakdown(req.userId, {
      startDate,
      endDate,
      type: type || 'EXPENSE',
    });
    res.json({ breakdown: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, incomeVsExpenses, categoryDistribution };
