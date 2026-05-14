import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function AuthVisual() {
  return (
    <div className="auth-visual" aria-hidden="true">
      <div className="floating-card card-one"><span>New Project</span><strong>Admin</strong><small>auto role</small></div>
      <div className="floating-card card-two"><span>Invite Code</span><strong>Ready</strong><small>team join</small></div>
      <div className="kanban-preview">
        <div><b>Create</b><i /></div>
        <div><b>Assign</b><i /></div>
        <div><b>Track</b><i /></div>
      </div>
    </div>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
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
        <span className="badge">Professional Assignment Build</span>
        <h1>Create your own team workspace with a premium interface.</h1>
        <p>Every new user can signup, create a project, become Admin, invite members, assign work, and track progress from a visual dashboard.</p>
        <AuthVisual />
      </section>
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="form-kicker">New workspace</span>
        <h2>Create account</h2>
        <p>Signup with name, email and password</p>
        {error && <div className="alert error">{error}</div>}
        <label>Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength="2" placeholder="Your name" />
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength="6" placeholder="Minimum 6 characters" />
        <button className="btn btn-primary full" disabled={loading}>{loading ? 'Creating...' : 'Launch Workspace'}</button>
        <small>Already have an account? <Link to="/login">Login</Link></small>
      </form>
    </div>
  );
}
