const {
  calculateNetSavings,
  calculateSavingsRate,
  calculateBudgetUtilization,
  formatCurrency,
  roundForCurrency,
  sum,
  convert,
  isSupportedCurrency,
} = require('../../utils/money');

describe('calculateNetSavings', () => {
  it('computes income minus expenses', () => {
    expect(calculateNetSavings(1000, 400).toNumber()).toBe(600);
  });

  it('handles negative cash flow (expenses exceed income)', () => {
    expect(calculateNetSavings(500, 800).toNumber()).toBe(-300);
  });

  it('handles zero activity', () => {
    expect(calculateNetSavings(0, 0).toNumber()).toBe(0);
  });

  it('never uses float arithmetic that loses precision', () => {
    // Classic float trap: 0.1 + 0.2 !== 0.3 in JS floats
    expect(calculateNetSavings(0.3, 0.1).toNumber()).toBe(0.2);
  });
});

describe('calculateSavingsRate', () => {
  it('computes percentage correctly', () => {
    expect(calculateSavingsRate(1000, 750)).toBe(25);
  });

  it('returns null (undefined rate) when income is zero', () => {
    expect(calculateSavingsRate(0, 100)).toBeNull();
  });

  it('returns null when income is negative (should not occur but guard anyway)', () => {
    expect(calculateSavingsRate(-100, 50)).toBeNull();
  });

  it('supports negative savings rate when expenses exceed income', () => {
    expect(calculateSavingsRate(100, 150)).toBe(-50);
  });
});

describe('calculateBudgetUtilization', () => {
  it('computes percentage of budget used', () => {
    expect(calculateBudgetUtilization(500, 1000)).toBe(50);
  });

  it('returns null when budget amount is zero, avoiding divide-by-zero', () => {
    expect(calculateBudgetUtilization(500, 0)).toBeNull();
  });

  it('can exceed 100 when overspent', () => {
    expect(calculateBudgetUtilization(1200, 1000)).toBe(120);
  });
});

describe('sum', () => {
  it('adds decimal-safe amounts without float drift', () => {
    const amounts = Array(10).fill('0.1');
    expect(sum(amounts).toNumber()).toBe(1);
  });
});

describe('roundForCurrency', () => {
  it('rounds INR/USD to 2 decimal places', () => {
    expect(roundForCurrency('10.126', 'USD').toString()).toBe('10.13');
  });

  it('rounds JPY to 0 decimal places (zero-decimal currency)', () => {
    expect(roundForCurrency('1500.6', 'JPY').toString()).toBe('1501');
  });
});

describe('formatCurrency', () => {
  it('formats INR with correct symbol', () => {
    expect(formatCurrency(1234.5, 'INR')).toContain('1,234.50');
  });

  it('formats JPY with zero decimals', () => {
    const formatted = formatCurrency(1500, 'JPY');
    expect(formatted).not.toContain('.00');
  });

  it('throws for unsupported currency codes', () => {
    expect(() => formatCurrency(10, 'XXX')).toThrow();
  });
});

describe('convert', () => {
  it('converts using a base->quote rate', () => {
    expect(convert(100, 83.5).toNumber()).toBe(8350);
  });
});

describe('isSupportedCurrency', () => {
  it('accepts all seven required currencies', () => {
    ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].forEach((c) => {
      expect(isSupportedCurrency(c)).toBe(true);
    });
  });

  it('rejects unknown currency codes', () => {
    expect(isSupportedCurrency('ZZZ')).toBe(false);
  });
});
