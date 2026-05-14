import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function AuthVisual() {
  return (
    <div className="auth-visual" aria-hidden="true">
      <div className="floating-card card-one">
        <span>Design Sprint</span>
        <strong>84%</strong>
        <small>progress</small>
      </div>
      <div className="floating-card card-two">
        <span>High Priority</span>
        <strong>7</strong>
        <small>open tasks</small>
      </div>
      <div className="kanban-preview">
        <div><b>To Do</b><i /></div>
        <div><b>Doing</b><i /></div>
        <div><b>Done</b><i /></div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <span className="badge">Full-Stack RBAC Project</span>
        <h1>Work smarter inside a futuristic team command center.</h1>
        <p>JWT auth, PostgreSQL relations, Admin/Member roles, Kanban workflows, dashboard analytics, and Railway-ready deployment in one polished app.</p>
        <AuthVisual />
      </section>
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="form-kicker">Secure login</span>
        <h2>Welcome back</h2>
        <p>Enter your workspace credentials</p>
        {error && <div className="alert error">{error}</div>}
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="admin@example.com" />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Pass1234" />
        <button className="btn btn-primary full" disabled={loading}>{loading ? 'Signing in...' : 'Enter Workspace'}</button>
        <div className="auth-links">
          <small><Link to="/forgot-password">Forgot password?</Link></small>
          <small>New here? <Link to="/signup">Create an account</Link></small>
        </div>
      </form>
    </div>
  );
}
