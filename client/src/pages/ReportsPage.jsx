import { useEffect, useState } from 'react';
import { reportsApi } from '../services/resourceApis';
import { CardSkeleton } from '../components/PageSkeleton';
import { formatMoney, formatPercent, CURRENCIES } from '../utils/money';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

export default function ReportsPage() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [currency, setCurrency] = useState('INR');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reportsApi
      .monthly({ month, year, currency })
      .then((data) => !cancelled && setReport(data))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month, year, currency]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-semibold">Financial reports</h1>

      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <input type="number" className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        <select className="input w-auto" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>
      </div>

      {loading || !report ? (
        <CardSkeleton lines={8} />
      ) : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <StatBox label="Income" value={formatMoney(report.income, currency)} tone="teal" />
            <StatBox label="Expenses" value={formatMoney(report.expenses, currency)} tone="brick" />
            <StatBox
              label="Net savings"
              value={formatMoney(report.netSavings, currency)}
              tone={report.netSavings >= 0 ? 'teal' : 'brick'}
            />
          </div>

          <div className="card p-4">
            <p className="text-sm text-ink-faint">
              Savings rate:{' '}
              <span className="font-medium text-ink dark:text-paper">
                {report.savingsRate === null ? 'Not applicable (no income recorded)' : formatPercent(report.savingsRate)}
              </span>
            </p>
          </div>

          {report.budget && (
            <div className="card p-4">
              <h2 className="font-semibold mb-2">Budget for this period</h2>
              <p className="text-sm">
                Spent {formatMoney(report.budget.spent, currency)} of {formatMoney(report.budget.total_budget, currency)} (
                {formatPercent(report.budget.utilizationPercent)})
              </p>
            </div>
          )}

          <div className="card p-4">
            <h2 className="font-semibold mb-3">Expense breakdown by category</h2>
            {report.categoryBreakdown.filter((c) => c.currency === currency).length === 0 ? (
              <p className="text-sm text-ink-faint">No expenses recorded for this period in {currency}.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line dark:divide-white/10">
                  {report.categoryBreakdown
                    .filter((c) => c.currency === currency)
                    .map((c) => (
                      <tr key={c.category_id || c.category_name}>
                        <td className="py-2">{c.category_name || 'Uncategorized'}</td>
                        <td className="py-2 text-right figure">{formatMoney(c.total, currency)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, tone }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-ink-faint mb-1">{label}</p>
      <p className={`figure text-xl font-semibold ${tone === 'teal' ? 'text-teal-600 dark:text-teal-400' : 'text-brick-500'}`}>{value}</p>
    </div>
  );
}
