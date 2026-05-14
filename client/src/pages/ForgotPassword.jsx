import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

function AuthVisual() {
  return (
    <div className="auth-visual" aria-hidden="true">
      <div className="floating-card card-one"><span>Token</span><strong>15m</strong><small>expiry</small></div>
      <div className="floating-card card-two"><span>Security</span><strong>Hash</strong><small>stored only</small></div>
      <div className="kanban-preview">
        <div><b>Request</b><i /></div>
        <div><b>Verify</b><i /></div>
        <div><b>Reset</b><i /></div>
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setResetUrl('');
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setMessage(data.message || 'Reset link generated.');
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <span className="badge">Secure Account Recovery</span>
        <h1>Generate a one-time reset link with pro-grade token handling.</h1>
        <p>The backend creates a one-time reset token, stores only its hash, and expires it after 15 minutes.</p>
        <AuthVisual />
      </section>

      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="form-kicker">Recovery mode</span>
        <h2>Reset password</h2>
        <p>Enter your registered email to create a reset link.</p>
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        {resetUrl && (
          <div className="demo-reset-box">
            <strong>Demo reset link</strong>
            <p>This project has no email provider connected, so the link is shown here for testing.</p>
            <Link className="btn btn-secondary full" to={new URL(resetUrl).pathname + new URL(resetUrl).search}>Open Reset Link</Link>
          </div>
        )}
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
        <button className="btn btn-primary full" disabled={loading}>{loading ? 'Generating...' : 'Generate Reset Link'}</button>
        <small>Remember password? <Link to="/login">Back to login</Link></small>
      </form>
    </div>
  );
}
