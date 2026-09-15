import { useEffect, useState } from 'react';
import { budgetsApi } from '../services/resourceApis';
import { useCategories } from '../hooks/useResources';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/apiClient';
import { CardSkeleton } from '../components/PageSkeleton';
import ConfirmDialog from '../components/ConfirmDialog';
import BudgetVsActualChart from '../charts/BudgetVsActualChart';
import { formatMoney, formatPercent, CURRENCIES } from '../utils/money';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const now = new Date();

export default function BudgetsPage() {
  const { notify } = useToast();
  const { categories } = useCategories('EXPENSE');
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    currency: 'INR',
    totalBudget: '',
    categoryLimits: {},
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setBudgets(await budgetsApi.list(year));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  function toggleCategoryLimit(categoryId, checked) {
    setForm((f) => {
      const next = { ...f.categoryLimits };
      if (checked) next[categoryId] = next[categoryId] ?? '';
      else delete next[categoryId];
      return { ...f, categoryLimits: next };
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await budgetsApi.create({
        month: Number(form.month),
        year: Number(form.year),
        currency: form.currency,
        totalBudget: Number(form.totalBudget),
        categories: Object.entries(form.categoryLimits).map(([categoryId, limitAmount]) => ({
          categoryId,
          limitAmount: Number(limitAmount || 0),
        })),
      });
      notify('Budget created.');
      setForm((f) => ({ ...f, totalBudget: '', categoryLimits: {} }));
      if (Number(form.year) === year) load();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not create budget.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await budgetsApi.remove(pendingDelete.id);
      notify('Budget deleted.');
      setPendingDelete(null);
      load();
    } catch {
      notify('Could not delete this budget.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-serif font-semibold">Budgets</h1>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-faint">Year</span>
          <input type="number" className="input w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
      </div>

      <form onSubmit={handleCreate} className="card p-4 space-y-4">
        <h2 className="font-semibold">Create a monthly budget</h2>
        {formError && <p className="text-sm text-brick-500">{formError}</p>}
        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label" htmlFor="bMonth">Month</label>
            <select id="bMonth" className="input" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bYear">Year</label>
            <input id="bYear" type="number" className="input" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="bCurrency">Currency</label>
            <select id="bCurrency" className="input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bTotal">Total budget</label>
            <input id="bTotal" type="number" step="0.01" required className="input" value={form.totalBudget} onChange={(e) => setForm((f) => ({ ...f, totalBudget: e.target.value }))} />
          </div>
        </div>

        {categories.length > 0 && (
          <div>
            <p className="label mb-2">Optional: set per-category limits</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {categories.map((c) => {
                const checked = c.id in form.categoryLimits;
                return (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      id={`cat-${c.id}`}
                      checked={checked}
                      onChange={(e) => toggleCategoryLimit(c.id, e.target.checked)}
                    />
                    <label htmlFor={`cat-${c.id}`} className="flex-1">{c.name}</label>
                    {checked && (
                      <input
                        type="number"
                        step="0.01"
                        className="input w-24 py-1"
                        placeholder="Limit"
                        value={form.categoryLimits[c.id]}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            categoryLimits: { ...f.categoryLimits, [c.id]: e.target.value },
                          }))
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create budget'}
        </button>
      </form>

      {loading ? (
        <CardSkeleton lines={6} />
      ) : budgets.length === 0 ? (
        <p className="text-sm text-ink-faint">No budgets set for {year} yet.</p>
      ) : (
        <>
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Budget vs. actual ({year})</h2>
            <BudgetVsActualChart budgets={budgets} />
          </div>

          <div className="space-y-4">
            {budgets.map((b) => (
              <BudgetCard key={b.id} budget={b} onDelete={() => setPendingDelete(b)} />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this budget?"
        description="This will remove the monthly budget and any category limits attached to it."
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
      />
    </div>
  );
}

function BudgetCard({ budget, onDelete }) {
  const pct = Math.min(budget.utilizationPercent ?? 0, 100);
  const barColor = budget.isOverBudget ? 'bg-brick-500' : budget.isNearLimit ? 'bg-amber-400' : 'bg-teal-500';

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{MONTHS[budget.month - 1]} {budget.year} &middot; {budget.currency}</h3>
        <button type="button" className="text-xs text-brick-500" onClick={onDelete}>Delete</button>
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-ink-faint">
          {formatMoney(budget.spent, budget.currency)} of {formatMoney(budget.total_budget, budget.currency)}
        </span>
        <span className={budget.isOverBudget ? 'text-brick-500 font-medium' : 'text-ink-faint'}>
          {formatPercent(budget.utilizationPercent)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-paper-sunken dark:bg-white/10 overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {budget.isOverBudget && (
        <p className="text-xs text-brick-500 mt-2">Over budget by {formatMoney(Math.abs(budget.remaining), budget.currency)}.</p>
      )}
      {!budget.isOverBudget && <p className="text-xs text-ink-faint mt-2">{formatMoney(budget.remaining, budget.currency)} remaining.</p>}

      {budget.categories?.length > 0 && (
        <div className="mt-4 pt-3 border-t border-line dark:border-white/10 space-y-2">
          {budget.categories.map((c) => (
            <div key={c.id} className="text-sm flex justify-between">
              <span>{c.category_name}</span>
              <span className="figure text-ink-faint">
                {formatMoney(c.spent, budget.currency)} / {formatMoney(c.limit_amount, budget.currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
