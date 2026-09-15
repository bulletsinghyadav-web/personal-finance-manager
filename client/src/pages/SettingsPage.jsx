import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/authApi';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/apiClient';
import ConfirmDialog from '../components/ConfirmDialog';
import { CURRENCIES } from '../utils/money';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-serif font-semibold">Settings</h1>
      <ProfileForm user={user} onSaved={refreshUser} notify={notify} />
      <PasswordForm notify={notify} onChanged={async () => { await logout(); navigate('/login'); }} />
      <DangerZone notify={notify} onDeleted={async () => { await logout(); navigate('/'); }} />
    </div>
  );
}

function ProfileForm({ user, onSaved, notify }) {
  const [name, setName] = useState(user?.name || '');
  const [defaultCurrency, setDefaultCurrency] = useState(user?.defaultCurrency || 'INR');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authApi.updateProfile({ name, defaultCurrency });
      await onSaved();
      notify('Profile updated.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <h2 className="font-semibold">Profile</h2>
      {error && <p className="text-sm text-brick-500">{error}</p>}
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input opacity-60" value={user?.email || ''} disabled />
      </div>
      <div>
        <label className="label" htmlFor="defaultCurrency">Default display currency</label>
        <select id="defaultCurrency" className="input" value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} &mdash; {c.label}</option>)}
        </select>
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}

function PasswordForm({ notify, onChanged }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      notify('Password changed. Please log in again.');
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change password.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <h2 className="font-semibold">Change password</h2>
      {error && <p className="text-sm text-brick-500">{error}</p>}
      <div>
        <label className="label" htmlFor="currentPassword">Current password</label>
        <input id="currentPassword" type="password" required className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="newPassword">New password</label>
        <input id="newPassword" type="password" required minLength={8} className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Updating...' : 'Change password'}
      </button>
    </form>
  );
}

function DangerZone({ notify, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [readyToConfirm, setReadyToConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setBusy(true);
    setError('');
    try {
      await authApi.deleteAccount({ password, confirm: true });
      onDeleted();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete your account.'));
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 border-brick-100 space-y-3">
      <h2 className="font-semibold text-brick-500">Danger zone</h2>
      <p className="text-sm text-ink-faint">
        Deleting your account permanently removes all of your accounts, transactions, budgets, and categories. This cannot be undone.
      </p>
      <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>
        Delete my account
      </button>

      {confirming && (
        <div className="pt-3 border-t border-line dark:border-white/10 space-y-2">
          {error && <p className="text-sm text-brick-500">{error}</p>}
          <label className="label" htmlFor="deletePassword">Confirm your password to continue</label>
          <input
            id="deletePassword"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="btn-danger"
            disabled={!password}
            onClick={() => setReadyToConfirm(true)}
          >
            Continue
          </button>
        </div>
      )}

      <ConfirmDialog
        open={readyToConfirm}
        title="Permanently delete your account?"
        description="All of your financial data will be permanently erased. This action cannot be undone."
        confirmLabel="Delete permanently"
        onCancel={() => setReadyToConfirm(false)}
        onConfirm={handleDelete}
        busy={busy}
      />
    </div>
  );
}
