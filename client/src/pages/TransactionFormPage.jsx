import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transactionsApi } from '../services/resourceApis';
import { useAccounts, useCategories } from '../hooks/useResources';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage, apiFieldErrors } from '../services/apiClient';
import { CURRENCIES } from '../utils/money';

const today = () => new Date().toISOString().slice(0, 10);

export default function TransactionFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { notify } = useToast();
  const { accounts, loading: accountsLoading } = useAccounts();

  const [form, setForm] = useState({
    type: 'EXPENSE',
    accountId: '',
    toAccountId: '',
    categoryId: '',
    amount: '',
    currency: 'INR',
    transactionDate: today(),
    description: '',
    notes: '',
  });
  const { categories } = useCategories(form.type === 'TRANSFER' ? undefined : form.type);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState([]);

  useEffect(() => {
    if (!isEdit) return;
    transactionsApi
      .get(id)
      .then((t) => {
        setForm({
          type: t.type,
          accountId: t.account_id,
          toAccountId: '',
          categoryId: t.category_id || '',
          amount: t.amount,
          currency: t.currency,
          transactionDate: t.transaction_date.slice(0, 10),
          description: t.description,
          notes: t.notes || '',
        });
      })
      .catch(() => setFormError('Could not load this transaction.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Default account currency to the selected account's currency for new transactions.
  useEffect(() => {
    if (isEdit) return;
    const acc = accounts.find((a) => a.id === form.accountId);
    if (acc) setForm((f) => ({ ...f, currency: acc.currency }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.accountId, accounts]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function fieldError(path) {
    return fieldErrors.find((e) => e.path === path)?.message;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFieldErrors([]);
    setSubmitting(true);
    try {
      const payload = {
        accountId: form.accountId,
        type: form.type,
        amount: Number(form.amount),
        currency: form.currency,
        transactionDate: form.transactionDate,
        description: form.description,
        notes: form.notes || null,
        ...(form.type === 'TRANSFER'
          ? { toAccountId: form.toAccountId }
          : { categoryId: form.categoryId || null }),
      };

      if (isEdit) {
        await transactionsApi.update(id, {
          accountId: payload.accountId,
          categoryId: payload.categoryId,
          amount: payload.amount,
          currency: payload.currency,
          transactionDate: payload.transactionDate,
          description: payload.description,
          notes: payload.notes,
        });
        notify('Transaction updated.');
      } else {
        await transactionsApi.create(payload);
        notify(form.type === 'TRANSFER' ? 'Transfer recorded.' : 'Transaction added.');
      }
      navigate('/transactions');
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save this transaction.'));
      setFieldErrors(apiFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || accountsLoading) {
    return <div className="card p-6 animate-pulse h-96" aria-busy="true" />;
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-serif font-semibold mb-4">{isEdit ? 'Edit transaction' : 'Add transaction'}</h1>

      {formError && (
        <p role="alert" className="text-sm text-brick-500 bg-brick-50 border border-brick-100 rounded px-3 py-2 mb-4">
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="card p-5 space-y-4">
        {!isEdit && (
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {['EXPENSE', 'INCOME', 'TRANSFER'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update('type', t)}
                  className={`flex-1 rounded border px-3 py-2 text-sm font-medium ${
                    form.type === t
                      ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400'
                      : 'border-line dark:border-white/15'
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="input"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
            />
            {fieldError('amount') && <p className="text-xs text-brick-500 mt-1">{fieldError('amount')}</p>}
          </div>
          <div>
            <label className="label" htmlFor="currency">Currency</label>
            <select id="currency" className="input" value={form.currency} onChange={(e) => update('currency', e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="accountId">{form.type === 'TRANSFER' ? 'From account' : 'Account'}</label>
          <select id="accountId" required className="input" value={form.accountId} onChange={(e) => update('accountId', e.target.value)}>
            <option value="">Select an account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
            ))}
          </select>
        </div>

        {form.type === 'TRANSFER' && !isEdit && (
          <div>
            <label className="label" htmlFor="toAccountId">To account</label>
            <select id="toAccountId" required className="input" value={form.toAccountId} onChange={(e) => update('toAccountId', e.target.value)}>
              <option value="">Select destination account...</option>
              {accounts.filter((a) => a.id !== form.accountId).map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
              ))}
            </select>
          </div>
        )}

        {form.type !== 'TRANSFER' && (
          <div>
            <label className="label" htmlFor="categoryId">Category</label>
            <select id="categoryId" className="input" value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor="transactionDate">Date</label>
          <input
            id="transactionDate"
            type="date"
            required
            className="input"
            value={form.transactionDate}
            onChange={(e) => update('transactionDate', e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <input id="description" required className="input" value={form.description} onChange={(e) => update('description', e.target.value)} />
          {fieldError('description') && <p className="text-xs text-brick-500 mt-1">{fieldError('description')}</p>}
        </div>

        <div>
          <label className="label" htmlFor="notes">Notes (optional)</label>
          <textarea id="notes" className="input" rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add transaction'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
