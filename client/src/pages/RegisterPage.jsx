import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage, apiFieldErrors } from '../services/apiClient';
import { CURRENCIES } from '../utils/money';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', defaultCurrency: 'INR' });
  const [errors, setErrors] = useState([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setErrors([]);
    setSubmitting(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not create your account.'));
      setErrors(apiFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(path) {
    return errors.find((e) => e.path === path)?.message;
  }

  return (
    <div className="card p-6">
      <h1 className="text-xl font-serif font-semibold mb-1">Create your account</h1>
      <p className="text-sm text-ink-faint mb-6">Start tracking your money in a couple of minutes.</p>

      {formError && (
        <p role="alert" className="text-sm text-brick-500 bg-brick-50 border border-brick-100 rounded px-3 py-2 mb-4">
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="input" required value={form.name} onChange={(e) => update('name', e.target.value)} />
          {fieldError('name') && <p className="text-xs text-brick-500 mt-1">{fieldError('name')}</p>}
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required value={form.email} onChange={(e) => update('email', e.target.value)} />
          {fieldError('email') && <p className="text-xs text-brick-500 mt-1">{fieldError('email')}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} />
          <p className="text-xs text-ink-faint mt-1">At least 8 characters, with a letter and a number.</p>
          {fieldError('password') && <p className="text-xs text-brick-500 mt-1">{fieldError('password')}</p>}
        </div>
        <div>
          <label className="label" htmlFor="currency">Default currency</label>
          <select id="currency" className="input" value={form.defaultCurrency} onChange={(e) => update('defaultCurrency', e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} &mdash; {c.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-ink-faint mt-6 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-teal-600 dark:text-teal-400 font-medium">Log in</Link>
      </p>
    </div>
  );
}
