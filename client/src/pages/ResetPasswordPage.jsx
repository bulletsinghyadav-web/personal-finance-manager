import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { apiErrorMessage } from '../services/apiClient';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-serif font-semibold mb-2">Invalid link</h1>
        <p className="text-sm text-ink-faint">
          This password reset link is missing its token. Please request a new one.
        </p>
        <Link to="/forgot-password" className="btn-primary w-full mt-4 inline-flex">Request new link</Link>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h1 className="text-xl font-serif font-semibold mb-1">Choose a new password</h1>

      {done ? (
        <p role="status" className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded px-3 py-2 mt-4">
          Password updated. Redirecting you to log in...
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
          {error && (
            <p role="alert" className="text-sm text-brick-500 bg-brick-50 border border-brick-100 rounded px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className="label" htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  );
}
