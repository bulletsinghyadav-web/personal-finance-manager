export const CURRENCIES = [
  { code: 'INR', symbol: '\u20B9', locale: 'en-IN', decimals: 2, label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', locale: 'en-US', decimals: 2, label: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', locale: 'de-DE', decimals: 2, label: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', locale: 'en-GB', decimals: 2, label: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', locale: 'en-CA', decimals: 2, label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', locale: 'en-AU', decimals: 2, label: 'Australian Dollar' },
  { code: 'JPY', symbol: '\u00A5', locale: 'ja-JP', decimals: 0, label: 'Japanese Yen' },
];

const META = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

export function formatMoney(amount, currency = 'INR') {
  const meta = META[currency] || META.INR;
  const num = Number(amount || 0);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(num);
  } catch {
    return `${meta.symbol}${num.toFixed(meta.decimals)}`;
  }
}

export function formatPercent(value) {
  if (value === null || value === undefined) return '\u2014';
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
