import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { apiErrorMessage } from '../services/apiClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const data = await authApi.forgotPassword({ email });
      setMessage(data.message);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-6">
      <h1 className="text-xl font-serif font-semibold mb-1">Reset your password</h1>
      <p className="text-sm text-ink-faint mb-6">
        Enter your account email and we&apos;ll send a link to reset your password.
      </p>

      {message && (
        <p role="status" className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded px-3 py-2 mb-4">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-brick-500 bg-brick-50 border border-brick-100 rounded px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="text-sm text-ink-faint mt-6 text-center">
        <Link to="/login" className="text-teal-600 dark:text-teal-400 font-medium">Back to log in</Link>
      </p>
    </div>
  );
}
