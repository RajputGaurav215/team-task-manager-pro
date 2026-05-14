import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('teamflow_theme') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('teamflow_theme', theme);
  }, [theme]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const firstName = user?.name?.split(' ')?.[0] || 'User';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand command-brand">
          <div className="brand-orbit" aria-hidden="true">
            <span />
            <strong>TF</strong>
          </div>
          <div>
            <p className="eyebrow">Mission Control</p>
            <h1>TeamFlow</h1>
            <p>Collaboration OS</p>
          </div>
        </div>

        <nav className="nav-list">
          <NavLink to="/dashboard"><span>⌁</span> Dashboard</NavLink>
          <NavLink to="/projects"><span>◈</span> Projects</NavLink>
        </nav>

        <div className="sidebar-panel command-panel">
          <span className="eyebrow">Smart Workflow</span>
          <h3>Kanban Sync</h3>
          <p>Drag a task card across columns and its status updates instantly in the database.</p>
          <div className="mini-flow" aria-hidden="true">
            <span>Todo</span>
            <i />
            <span>Doing</span>
            <i />
            <span>Done</span>
          </div>
        </div>

        <div className="user-card">
          <div className="avatar glow">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
        <button className="btn btn-muted full" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Live workspace</span>
            <h2>Welcome back, {firstName} 👋</h2>
          </div>
          <div className="topbar-actions">
            <div className="status-chip"><span /> Online</div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'} Mode
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
