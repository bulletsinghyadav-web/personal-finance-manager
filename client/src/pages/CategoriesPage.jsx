import { useState } from 'react';
import { useCategories } from '../hooks/useResources';
import { categoriesApi } from '../services/resourceApis';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/apiClient';
import { TableSkeleton } from '../components/PageSkeleton';
import ConfirmDialog from '../components/ConfirmDialog';

export default function CategoriesPage() {
  const { categories, loading, reload } = useCategories();
  const { notify } = useToast();
  const [form, setForm] = useState({ name: '', type: 'EXPENSE' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await categoriesApi.create(form);
      setForm({ name: '', type: 'EXPENSE' });
      notify('Category created.');
      reload();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create category.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await categoriesApi.remove(pendingDelete.id);
      notify('Category deleted.');
      setPendingDelete(null);
      reload();
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not delete this category.'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  const income = categories.filter((c) => c.type === 'INCOME');
  const expense = categories.filter((c) => c.type === 'EXPENSE');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-semibold">Categories</h1>

      <form onSubmit={handleCreate} className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="label" htmlFor="catName">New category name</label>
          <input id="catName" required className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="catType">Type</label>
          <select id="catType" className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add category'}
        </button>
        {error && <p className="text-sm text-brick-500 w-full">{error}</p>}
      </form>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <CategoryGroup title="Income categories" items={income} onDelete={setPendingDelete} />
          <CategoryGroup title="Expense categories" items={expense} onDelete={setPendingDelete} />
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this category?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be hidden from new transactions. Past transactions keep this category for accurate history.`
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
      />
    </div>
  );
}

function CategoryGroup({ title, items, onDelete }) {
  return (
    <div className="card p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-faint">No categories yet.</p>
      ) : (
        <ul className="divide-y divide-line dark:divide-white/10">
          {items.map((c) => (
            <li key={c.id} className="py-2 flex items-center justify-between text-sm">
              <span>
                {c.name} {c.is_default && <span className="text-xs text-ink-faint">(default)</span>}
              </span>
              {!c.is_default && (
                <button type="button" className="text-brick-500 text-xs" onClick={() => onDelete(c)}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
