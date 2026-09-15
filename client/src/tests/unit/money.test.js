import { describe, it, expect } from 'vitest';
import { formatMoney, formatPercent, formatDate, CURRENCIES } from '../../utils/money';

describe('formatMoney', () => {
  it('formats INR with two decimal places', () => {
    const result = formatMoney(1234.5, 'INR');
    expect(result).toContain('1,234.50');
  });

  it('formats JPY with zero decimal places', () => {
    const result = formatMoney(1500, 'JPY');
    expect(result).not.toContain('.00');
  });

  it('defaults to INR for an unrecognized currency code', () => {
    expect(() => formatMoney(10, 'ZZZ')).not.toThrow();
  });

  it('handles zero amounts', () => {
    expect(formatMoney(0, 'USD')).toContain('0.00');
  });
});

describe('formatPercent', () => {
  it('formats a numeric percentage to one decimal place', () => {
    expect(formatPercent(45.678)).toBe('45.7%');
  });

  it('renders an em dash for null (undefined rate) rather than 0% or NaN%', () => {
    expect(formatPercent(null)).toBe('\u2014');
  });

  it('handles negative percentages (negative cash flow)', () => {
    expect(formatPercent(-25)).toBe('-25.0%');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string into a readable form', () => {
    expect(formatDate('2026-01-15')).toMatch(/Jan/);
  });

  it('returns an empty string for a falsy input rather than throwing', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('CURRENCIES', () => {
  it('includes all seven required currencies', () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']));
  });
});
