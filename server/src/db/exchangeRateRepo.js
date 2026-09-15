const { query } = require('./pool');

/**
 * Fallback static rates (approximate, for development/demo only) used when
 * no live provider is configured and no stored rate exists for the pair.
 * Expressed as "1 unit of base = rate units of quote". Real deployments
 * should configure EXCHANGE_RATE_PROVIDER and populate the exchange_rates
 * table from a live source on a schedule.
 */
const STATIC_FALLBACK_RATES_TO_USD = {
  USD: 1,
  INR: 1 / 83.5,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.73,
  AUD: 0.66,
  JPY: 1 / 150.0,
};

function staticRate(base, quote) {
  if (base === quote) return 1;
  const baseToUsd = STATIC_FALLBACK_RATES_TO_USD[base];
  const quoteToUsd = STATIC_FALLBACK_RATES_TO_USD[quote];
  if (!baseToUsd || !quoteToUsd) return null;
  return baseToUsd / quoteToUsd;
}

async function findStoredRate(base, quote, asOfDate) {
  const res = await query(
    `SELECT * FROM exchange_rates
     WHERE base_currency = $1 AND quote_currency = $2 AND as_of_date <= $3
     ORDER BY as_of_date DESC LIMIT 1`,
    [base, quote, asOfDate]
  );
  return res.rows[0] || null;
}

async function storeRate(base, quote, rate, asOfDate, source = 'manual') {
  const res = await query(
    `INSERT INTO exchange_rates (base_currency, quote_currency, rate, as_of_date, source)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (base_currency, quote_currency, as_of_date)
     DO UPDATE SET rate = EXCLUDED.rate
     RETURNING *`,
    [base, quote, rate, asOfDate, source]
  );
  return res.rows[0];
}

/**
 * Resolve a conversion rate for reporting: prefer a stored rate as-of the
 * given date; otherwise fall back to the static table; otherwise return
 * null so callers can clearly label the value as "not converted".
 */
async function resolveRate(base, quote, asOfDate) {
  if (base === quote) return { rate: 1, source: 'identity', asOfDate };
  const stored = await findStoredRate(base, quote, asOfDate);
  if (stored) return { rate: Number(stored.rate), source: stored.source, asOfDate: stored.as_of_date };
  const fallback = staticRate(base, quote);
  if (fallback) return { rate: fallback, source: 'static_fallback', asOfDate };
  return null;
}

module.exports = { findStoredRate, storeRate, resolveRate, staticRate };
