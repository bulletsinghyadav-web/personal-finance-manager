import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/resourceApis';
import { useCurrency } from '../context/CurrencyContext';
import { CardSkeleton } from '../components/PageSkeleton';
import EmptyState from '../components/EmptyState';
import IncomeExpenseChart from '../charts/IncomeExpenseChart';
import CategoryPieChart from '../charts/CategoryPieChart';
import SavingsTrendChart from '../charts/SavingsTrendChart';
import { formatMoney, formatPercent, formatDate } from '../utils/money';
import { CURRENCIES } from '../utils/money';

export default function DashboardPage() {
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      dashboardApi.summary(displayCurrency),
      dashboardApi.incomeVsExpenses(12),
      dashboardApi.categoryDistribution({}),
    ])
      .then(([s, sr, bd]) => {
        if (cancelled) return;
        setSummary(s);
        setSeries(sr);
        setBreakdown(bd);
      })
      .catch(() => !cancelled && setError('Could not load your dashboard right now.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [displayCurrency]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={1} />)}
        </div>
        <CardSkeleton lines={6} />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Something went wrong" description={error} />;
  }

  const { totals, currentMonth, recentTransactions, topSpendingCategories, anyUnconvertedCurrencies } = summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-serif font-semibold">Dashboard</h1>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-faint">Display currency</span>
          <select className="input w-auto" value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
        </label>
      </div>

      {anyUnconvertedCurrencies?.length > 0 && (
        <p className="text-xs text-amber-500 bg-amber-400/10 border border-amber-400/30 rounded px-3 py-2">
          Some transactions are in {anyUnconvertedCurrencies.join(', ')} and could not be converted to {displayCurrency}
          {' '}(no exchange rate available), so they are excluded from the totals below.
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total income" value={formatMoney(totals.totalIncome, displayCurrency)} tone="teal" />
        <StatCard label="Total expenses" value={formatMoney(totals.totalExpenses, displayCurrency)} tone="brick" />
        <StatCard
          label="Net savings"
          value={formatMoney(totals.netSavings, displayCurrency)}
          tone={totals.netSavings >= 0 ? 'teal' : 'brick'}
        />
        <StatCard
          label="Savings rate"
          value={totals.savingsRate === null ? 'N/A' : formatPercent(totals.savingsRate)}
          tone="ink"
          hint={totals.savingsRate === null ? 'No income recorded yet' : undefined}
        />
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-1">This month ({currentMonth.month}/{currentMonth.year})</h2>
        <div className="grid sm:grid-cols-3 gap-4 mt-3 text-sm">
          <div>
            <p className="text-ink-faint">Income</p>
            <p className="figure text-lg">{formatMoney(currentMonth.income, displayCurrency)}</p>
          </div>
          <div>
            <p className="text-ink-faint">Expenses</p>
            <p className="figure text-lg">{formatMoney(currentMonth.expenses, displayCurrency)}</p>
          </div>
          <div>
            <p className="text-ink-faint">Net</p>
            <p className={`figure text-lg ${currentMonth.netSavings >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-brick-500'}`}>
              {formatMoney(currentMonth.netSavings, displayCurrency)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Income vs. expenses</h2>
          <IncomeExpenseChart series={series} currency={displayCurrency} />
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Spending by category (this month)</h2>
          <CategoryPieChart breakdown={breakdown} currency={displayCurrency} />
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Savings trend</h2>
        <SavingsTrendChart series={series} currency={displayCurrency} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent transactions</h2>
            <Link to="/transactions" className="text-sm text-teal-600 dark:text-teal-400">View all</Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-ink-faint">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-line dark:divide-white/10">
              {recentTransactions.map((t) => (
                <li key={t.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{t.description}</p>
                    <p className="text-ink-faint text-xs">{formatDate(t.transaction_date)} &middot; {t.category_name || t.type}</p>
                  </div>
                  <span className={`figure ${t.type === 'INCOME' ? 'text-teal-600 dark:text-teal-400' : t.type === 'EXPENSE' ? 'text-brick-500' : 'text-ink-faint'}`}>
                    {t.type === 'EXPENSE' ? '-' : t.type === 'INCOME' ? '+' : ''}{formatMoney(t.amount, t.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-3">Top spending categories</h2>
          {topSpendingCategories.length === 0 ? (
            <p className="text-sm text-ink-faint">No expenses recorded this month.</p>
          ) : (
            <ul className="space-y-2">
              {topSpendingCategories.map((c) => (
                <li key={c.category_id || c.category_name} className="flex items-center justify-between text-sm">
                  <span>{c.category_name || 'Uncategorized'}</span>
                  <span className="figure">{formatMoney(c.total, c.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, hint }) {
  const toneClass =
    tone === 'teal' ? 'text-teal-600 dark:text-teal-400' : tone === 'brick' ? 'text-brick-500' : 'text-ink dark:text-paper';
  return (
    <div className="card p-4">
      <p className="text-xs text-ink-faint mb-1">{label}</p>
      <p className={`figure text-xl font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="text-xs text-ink-faint mt-1">{hint}</p>}
    </div>
  );
}
