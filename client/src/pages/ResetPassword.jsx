import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';

function AuthVisual() {
  return (
    <div className="auth-visual" aria-hidden="true">
      <div className="floating-card card-one"><span>One Time</span><strong>Token</strong><small>single use</small></div>
      <div className="floating-card card-two"><span>Access</span><strong>Safe</strong><small>bcrypt hash</small></div>
      <div className="kanban-preview">
        <div><b>Token</b><i /></div>
        <div><b>Password</b><i /></div>
        <div><b>Login</b><i /></div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token missing. Please generate a new reset link.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await api('/auth/reset-password', {
        method: 'POST',
        body: { token, password: form.password }
      });
      setMessage(data.message);
      setForm({ password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <span className="badge">One-Time Token</span>
        <h1>Create a new password and return to your workspace securely.</h1>
        <p>For security, this reset link can be used once and expires after 15 minutes.</p>
        <AuthVisual />
      </section>

      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="form-kicker">Set credentials</span>
        <h2>Set new password</h2>
        <p>Use at least 6 characters.</p>
        {!token && <div className="alert error">Reset token missing. Please request a new reset link.</div>}
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <label>New Password</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength="6"
          placeholder="New password"
        />
        <label>Confirm Password</label>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
          minLength="6"
          placeholder="Confirm new password"
        />
        <button className="btn btn-primary full" disabled={loading || !token}>{loading ? 'Updating...' : 'Update Password'}</button>
        <small><Link to="/forgot-password">Generate new reset link</Link> · <Link to="/login">Login</Link></small>
      </form>
    </div>
  );
}
