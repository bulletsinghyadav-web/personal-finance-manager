import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { transactionsApi } from '../services/resourceApis';
import { useAccounts, useCategories } from '../hooks/useResources';
import { TableSkeleton } from '../components/PageSkeleton';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { formatMoney, formatDate } from '../utils/money';

const PAGE_SIZE = 15;

export default function TransactionsPage() {
  const { notify } = useToast();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const [filters, setFilters] = useState({
    page: 1,
    type: '',
    categoryId: '',
    accountId: '',
    search: '',
    startDate: '',
    endDate: '',
    sortBy: 'transactionDate',
    sortOrder: 'desc',
  });
  const [result, setResult] = useState({ data: [], pagination: { total: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters, pageSize: PAGE_SIZE };
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
      const data = await transactionsApi.list(params);
      setResult(data);
    } catch {
      setError('Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilter(patch) {
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await transactionsApi.remove(pendingDelete.id);
      notify('Transaction deleted.');
      setPendingDelete(null);
      load();
    } catch {
      notify('Could not delete this transaction.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-serif font-semibold">Transactions</h1>
        <Link to="/transactions/new" className="btn-primary">Add transaction</Link>
      </div>

      <div className="card p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          className="input lg:col-span-2"
          placeholder="Search description or notes..."
          value={filters.search}
          onChange={(e) => updateFilter({ search: e.target.value })}
        />
        <select className="input" value={filters.type} onChange={(e) => updateFilter({ type: e.target.value })}>
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
          <option value="TRANSFER">Transfer</option>
        </select>
        <select className="input" value={filters.categoryId} onChange={(e) => updateFilter({ categoryId: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input" value={filters.accountId} onChange={(e) => updateFilter({ accountId: e.target.value })}>
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <input type="date" className="input" value={filters.startDate} onChange={(e) => updateFilter({ startDate: e.target.value })} />
        <input type="date" className="input" value={filters.endDate} onChange={(e) => updateFilter({ endDate: e.target.value })} />
        <select
          className="input"
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split(':');
            updateFilter({ sortBy, sortOrder });
          }}
        >
          <option value="transactionDate:desc">Date (newest first)</option>
          <option value="transactionDate:asc">Date (oldest first)</option>
          <option value="amount:desc">Amount (high to low)</option>
          <option value="amount:asc">Amount (low to high)</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={PAGE_SIZE} />
      ) : error ? (
        <EmptyState title="Something went wrong" description={error} />
      ) : result.data.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="Try adjusting your filters, or add your first transaction."
          action={<Link to="/transactions/new" className="btn-primary">Add transaction</Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-ink-faint border-b border-line dark:border-white/10">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-white/10">
              {result.data.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(t.transaction_date)}</td>
                  <td className="px-4 py-2">{t.description}</td>
                  <td className="px-4 py-2">{t.category_name || (t.type === 'TRANSFER' ? 'Transfer' : '—')}</td>
                  <td className="px-4 py-2">{t.account_name}</td>
                  <td
                    className={`px-4 py-2 text-right figure ${
                      t.type === 'INCOME' ? 'text-teal-600 dark:text-teal-400' : t.type === 'EXPENSE' ? 'text-brick-500' : 'text-ink-faint'
                    }`}
                  >
                    {t.type === 'EXPENSE' ? '-' : t.type === 'INCOME' ? '+' : ''}
                    {formatMoney(t.amount, t.currency)}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                    {t.type !== 'TRANSFER' && (
                      <Link to={`/transactions/${t.id}/edit`} className="text-teal-600 dark:text-teal-400">
                        Edit
                      </Link>
                    )}
                    <button type="button" className="text-brick-500" onClick={() => setPendingDelete(t)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-line dark:border-white/10 text-sm">
            <span className="text-ink-faint">
              Page {result.pagination.page} of {result.pagination.totalPages} &middot; {result.pagination.total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={filters.page <= 1}
                onClick={() => updateFilter({ page: filters.page - 1 })}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={filters.page >= result.pagination.totalPages}
                onClick={() => updateFilter({ page: filters.page + 1 })}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this transaction?"
        description={pendingDelete ? `"${pendingDelete.description}" will be permanently removed. This cannot be undone.` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
      />
    </div>
  );
}
