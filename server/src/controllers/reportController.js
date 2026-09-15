const transactionRepo = require('../db/transactionRepo');
const budgetRepo = require('../db/budgetRepo');
const { calculateNetSavings, calculateSavingsRate, calculateBudgetUtilization } = require('../utils/money');

function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

async function monthlyReport(req, res, next) {
  try {
    const month = Number(req.query.month) || new Date().getUTCMonth() + 1;
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const currency = req.query.currency;
    const { startDate, endDate } = monthRange(year, month);

    const rows = await transactionRepo.aggregateTotalsByCurrency(req.userId, { startDate, endDate });
    const filtered = currency ? rows.filter((r) => r.currency === currency) : rows;

    // Only sum into a single number when a currency filter narrows to one
    // currency; otherwise expose a per-currency breakdown so we never add
    // incompatible currencies together.
    const perCurrencyIncome = filtered.filter((r) => r.type === 'INCOME');
    const perCurrencyExpenses = filtered.filter((r) => r.type === 'EXPENSE');
    const income = currency ? perCurrencyIncome.reduce((a, r) => a + Number(r.total), 0) : null;
    const expenses = currency ? perCurrencyExpenses.reduce((a, r) => a + Number(r.total), 0) : null;

    const categoryBreakdown = await transactionRepo.categoryBreakdown(req.userId, {
      startDate,
      endDate,
      type: 'EXPENSE',
    });

    let budget = null;
    if (currency) {
      budget = await budgetRepo.findByPeriod(req.userId, month, year, currency);
      if (budget) {
        const spent = await budgetRepo.totalSpend(req.userId, month, year, currency);
        budget = {
          ...budget,
          spent,
          utilizationPercent: calculateBudgetUtilization(spent, budget.total_budget),
        };
      }
    }

    res.json({
      month,
      year,
      currency: currency || null,
      income,
      expenses,
      netSavings: currency ? calculateNetSavings(income, expenses).toNumber() : null,
      savingsRate: currency ? calculateSavingsRate(income, expenses) : null,
      perCurrencyIncome: currency ? undefined : perCurrencyIncome,
      perCurrencyExpenses: currency ? undefined : perCurrencyExpenses,
      categoryBreakdown,
      budget,
      note:
        currency
          ? undefined
          : 'No currency filter applied; income/expenses are shown per-currency rather than summed, since different currencies cannot be added directly.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { monthlyReport };
