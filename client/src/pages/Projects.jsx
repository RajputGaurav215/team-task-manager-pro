import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [inviteCode, setInviteCode] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadProjects() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/projects');
      setProjects(data.projects);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const membership = project.members.find((m) => m.userId === user?.id);
      const matchesQuery = `${project.name} ${project.description || ''}`.toLowerCase().includes(query.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || membership?.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [projects, query, roleFilter, user?.id]);

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api('/projects', { method: 'POST', body: createForm });
      setCreateForm({ name: '', description: '' });
      setMessage('Project created successfully. You are the Admin.');
      await loadProjects();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api('/projects/join', { method: 'POST', body: { inviteCode } });
      setInviteCode('');
      setMessage('Joined project successfully.');
      await loadProjects();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page fade-in">
      <section className="hero-card compact-hero">
        <div>
          <span className="eyebrow">Workspace Control</span>
          <h1>Projects built for teams, roles, and delivery tracking.</h1>
          <p>Create a project as Admin, invite members, and view progress from interactive project cards.</p>
        </div>
        <button className="btn btn-primary" onClick={loadProjects}>Refresh Projects</button>
      </section>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <section className="grid-2 align-start">
        <form className="card form-card elevated" onSubmit={handleCreate}>
          <div className="section-title">
            <h3>Create Project</h3>
            <span className="pill neutral">Admin</span>
          </div>
          <label>Project Name</label>
          <input
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            required
            minLength="3"
            placeholder="e.g. Client Portal Launch"
          />
          <label>Description</label>
          <textarea
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            rows="4"
            placeholder="Short project objective and scope"
          />
          <button className="btn btn-primary">Create as Admin</button>
        </form>

        <form className="card form-card elevated" onSubmit={handleJoin}>
          <div className="section-title">
            <h3>Join Project</h3>
            <span className="pill neutral">Member</span>
          </div>
          <p className="muted">Paste the invite code shared by a project Admin.</p>
          <label>Invite Code</label>
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
            placeholder="DEMO123"
          />
          <button className="btn btn-secondary">Join as Member</button>
        </form>
      </section>

      <section className="toolbar card soft-card">
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects by name or description..."
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="ALL">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
        </select>
      </section>

      <section className="projects-grid">
        {loading && Array.from({ length: 3 }).map((_, index) => <div className="skeleton project-card" key={index} />)}
        {!loading && filteredProjects.length === 0 && <div className="empty-state">No projects found. Create one or join with an invite code.</div>}
        {filteredProjects.map((project) => {
          const currentUserMembership = project.members.find((m) => m.userId === user?.id);
          const summary = project.taskSummary || { progress: 0, overdue: 0, total: 0, done: 0 };
          return (
            <Link className="project-card pro-card" to={`/projects/${project.id}`} key={project.id}>
              <div className="project-card-top">
                <span className={`pill ${currentUserMembership?.role === 'ADMIN' ? 'success' : 'neutral'}`}>{currentUserMembership?.role || 'MEMBER'}</span>
                <span className="pill">{project._count.tasks} Tasks</span>
              </div>
              <h3>{project.name}</h3>
              <p>{project.description || 'No description provided.'}</p>

              <div className="progress-block">
                <div className="progress-label">
                  <span>Progress</span>
                  <strong>{summary.progress}%</strong>
                </div>
                <div className="progress-track"><span style={{ width: `${summary.progress}%` }} /></div>
              </div>

              <div className="project-insights">
                <span>{project._count.members} members</span>
                <span>{summary.done}/{summary.total} done</span>
                <span className={summary.overdue ? 'danger-text' : ''}>{summary.overdue} overdue</span>
              </div>

              <div className="avatar-stack" title="Project members">
                {project.members.slice(0, 5).map((member) => (
                  <span key={member.id}>{initials(member.user.name)}</span>
                ))}
                {project.members.length > 5 && <span>+{project.members.length - 5}</span>}
              </div>

              <div className="project-meta">
                <span>Invite: <strong>{project.inviteCode}</strong></span>
                <span>Open →</span>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
