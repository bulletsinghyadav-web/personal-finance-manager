import { useState } from 'react';
import { useAccounts } from '../hooks/useResources';
import { accountsApi } from '../services/resourceApis';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/apiClient';
import { CardSkeleton } from '../components/PageSkeleton';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatMoney, CURRENCIES } from '../utils/money';

const ACCOUNT_TYPES = ['CASH', 'BANK', 'SAVINGS', 'CREDIT_CARD', 'OTHER'];

export default function AccountsPage() {
  const { accounts, loading, reload } = useAccounts();
  const { notify } = useToast();
  const [form, setForm] = useState({ name: '', type: 'BANK', currency: 'INR', openingBalance: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await accountsApi.create({ ...form, openingBalance: Number(form.openingBalance) });
      setForm({ name: '', type: 'BANK', currency: 'INR', openingBalance: 0 });
      notify('Account created.');
      reload();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create account.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await accountsApi.remove(pendingDelete.id);
      notify('Account deleted.');
      setPendingDelete(null);
      reload();
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not delete this account.'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-semibold">Accounts</h1>

      <form onSubmit={handleCreate} className="card p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="label" htmlFor="accName">Account name</label>
          <input id="accName" required className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="accType">Type</label>
          <select id="accType" className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="accCurrency">Currency</label>
          <select id="accCurrency" className="input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="accOpening">Opening balance</label>
          <input
            id="accOpening"
            type="number"
            step="0.01"
            className="input"
            value={form.openingBalance}
            onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
          />
        </div>
        <button type="submit" className="btn-primary lg:col-span-5 sm:col-span-2" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add account'}
        </button>
        {error && <p className="text-sm text-brick-500 sm:col-span-2 lg:col-span-5">{error}</p>}
      </form>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-ink-faint">No accounts yet. Add one above to start recording transactions.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-ink-faint">{a.type.replace('_', ' ')} &middot; {a.currency}</p>
                </div>
                <button type="button" className="text-xs text-brick-500" onClick={() => setPendingDelete(a)}>
                  Delete
                </button>
              </div>
              <p className="figure text-2xl font-semibold mt-4">{formatMoney(a.current_balance, a.currency)}</p>
              <p className="text-xs text-ink-faint mt-1">Opening balance: {formatMoney(a.opening_balance, a.currency)}</p>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this account?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be permanently removed. Accounts with existing transactions cannot be deleted — archive them instead.`
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
      />
    </div>
  );
}
