import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../services/apiClient';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not log in.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-6">
      <h1 className="text-xl font-serif font-semibold mb-1">Welcome back</h1>
      <p className="text-sm text-ink-faint mb-6">Log in to see your latest numbers.</p>

      {error && (
        <p role="alert" className="text-sm text-brick-500 bg-brick-50 border border-brick-100 rounded px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="text-xs text-teal-600 dark:text-teal-400">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            className="input"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="text-sm text-ink-faint mt-6 text-center">
        New here?{' '}
        <Link to="/register" className="text-teal-600 dark:text-teal-400 font-medium">Create an account</Link>
      </p>
    </div>
  );
}
