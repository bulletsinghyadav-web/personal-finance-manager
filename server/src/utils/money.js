const Decimal = require('decimal.js');

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY']);

const CURRENCY_META = {
  INR: { symbol: '\u20B9', decimals: 2, locale: 'en-IN' },
  USD: { symbol: '$', decimals: 2, locale: 'en-US' },
  EUR: { symbol: '\u20AC', decimals: 2, locale: 'de-DE' },
  GBP: { symbol: '\u00A3', decimals: 2, locale: 'en-GB' },
  CAD: { symbol: 'CA$', decimals: 2, locale: 'en-CA' },
  AUD: { symbol: 'A$', decimals: 2, locale: 'en-AU' },
  JPY: { symbol: '\u00A5', decimals: 0, locale: 'ja-JP' },
};

const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_META);

function isSupportedCurrency(code) {
  return SUPPORTED_CURRENCIES.includes(code);
}

function decimalsFor(currency) {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : CURRENCY_META[currency]?.decimals ?? 2;
}

/** Round a Decimal (or numeric string) to the currency's canonical precision. */
function roundForCurrency(value, currency) {
  const d = new Decimal(value);
  return d.toDecimalPlaces(decimalsFor(currency), Decimal.ROUND_HALF_UP);
}

/** Add an array of Decimal-safe amounts. All amounts MUST already be in the same currency. */
function sum(amounts) {
  return amounts.reduce((acc, v) => acc.plus(new Decimal(v || 0)), new Decimal(0));
}

/**
 * Format an amount for display in its currency, including correct locale digit
 * grouping (e.g. Indian lakh/crore grouping for INR) and currency symbol.
 */
function formatCurrency(amount, currency) {
  const meta = CURRENCY_META[currency];
  if (!meta) throw new Error(`Unsupported currency: ${currency}`);
  const num = new Decimal(amount || 0).toNumber();
  const formatted = new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(num);
  return formatted;
}

/**
 * Net savings = total income - total expenses (same currency only).
 */
function calculateNetSavings(totalIncome, totalExpenses) {
  return new Decimal(totalIncome || 0).minus(new Decimal(totalExpenses || 0));
}

/**
 * Savings rate = (net savings / total income) * 100, defined only when income > 0.
 * Returns null when income is zero (undefined rate), rather than throwing or
 * returning a misleading 0%/Infinity.
 */
function calculateSavingsRate(totalIncome, totalExpenses) {
  const income = new Decimal(totalIncome || 0);
  if (income.lessThanOrEqualTo(0)) return null;
  const net = calculateNetSavings(income, totalExpenses);
  return net.dividedBy(income).times(100).toDecimalPlaces(2).toNumber();
}

/**
 * Budget utilization = (eligible spend / budget amount) * 100.
 * Returns null when budget amount is zero (undefined utilization) to avoid
 * division by zero / Infinity.
 */
function calculateBudgetUtilization(spent, budgetAmount) {
  const budget = new Decimal(budgetAmount || 0);
  if (budget.lessThanOrEqualTo(0)) return null;
  return new Decimal(spent || 0).dividedBy(budget).times(100).toDecimalPlaces(2).toNumber();
}

/**
 * Convert an amount from one currency to another using a rate expressed as
 * "1 unit of `from` = rate units of `to`". Returns a Decimal.
 */
function convert(amount, rate) {
  return new Decimal(amount || 0).times(new Decimal(rate));
}

module.exports = {
  CURRENCY_META,
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  decimalsFor,
  roundForCurrency,
  sum,
  formatCurrency,
  calculateNetSavings,
  calculateSavingsRate,
  calculateBudgetUtilization,
  convert,
  Decimal,
};
