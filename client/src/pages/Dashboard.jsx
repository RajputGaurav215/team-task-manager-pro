import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api.js';

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusClass(status) {
  return status.toLowerCase().replace('_', '-');
}

function MiniStat({ label, value, hint, tone = '' }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/dashboard');
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const progressTrend = useMemo(() => {
    if (!stats) return [];
    const done = stats.byStatus.find((item) => item.name === 'DONE')?.value || stats.completedCount || 0;
    const progress = stats.completionRate || 0;
    return [
      { name: 'Start', value: 0 },
      { name: 'Current', value: progress },
      { name: `${done} Done`, value: Math.max(progress, 1) }
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton hero-skeleton" />
        <div className="stats-grid">{Array.from({ length: 4 }).map((_, index) => <div className="skeleton stat-card" key={index} />)}</div>
      </div>
    );
  }

  if (error) return <div className="alert error">{error}</div>;

  return (
    <div className="page fade-in">
      <section className="hero-card">
        <div>
          <span className="eyebrow">Executive Overview</span>
          <h1>Team progress, deadlines, and workload in one place.</h1>
          <p>Monitor total work, overdue tasks, member workload, and recent project activity using production-style API data.</p>
        </div>
        <div className="hero-progress">
          <div className="ring" style={{ '--value': `${stats.completionRate}%` }}>
            <span>{stats.completionRate}%</span>
          </div>
          <strong>Completion Rate</strong>
        </div>
      </section>

      <section className="stats-grid">
        <MiniStat label="Projects" value={stats.totalProjects} hint="active workspaces" />
        <MiniStat label="Total Tasks" value={stats.totalTasks} hint="visible to your role" />
        <MiniStat label="Overdue" value={stats.overdueCount} hint="need attention" tone="danger" />
        <MiniStat label="High Priority" value={stats.highPriorityOpen} hint="open blockers" tone="warning" />
      </section>

      <section className="grid-3">
        <div className="card chart-card span-2">
          <div className="section-title">
            <h3>Completion Trend</h3>
            <button className="btn btn-muted tiny" onClick={loadDashboard}>Refresh</button>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={progressTrend}>
              <defs>
                <linearGradient id="progressFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} domain={[0, 100]} />
              <Tooltip />
              <Area dataKey="value" stroke="currentColor" fill="url(#progressFill)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.byStatus} dataKey="value" nameKey="name" outerRadius={92} innerRadius={48} paddingAngle={4} label>
                {stats.byStatus.map((_, index) => <Cell key={index} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid-2">
        <div className="card chart-card">
          <h3>Tasks per User</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.tasksPerUser}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Priority Mix</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byPriority} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 12, 12, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid-3 align-start">
        <div className="card span-2">
          <div className="section-title">
            <h3>Urgent Work</h3>
            <span>{stats.overdueTasks.length} overdue</span>
          </div>
          <div className="task-list compact">
            {stats.overdueTasks.length === 0 && <p className="muted">No overdue tasks. Great job!</p>}
            {stats.overdueTasks.map((task) => (
              <div className="task-row interactive" key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.project.name} • {task.assignedTo.name}</span>
                </div>
                <small className="pill danger">{formatDate(task.dueDate)}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <h3>Activity Feed</h3>
            <span>latest</span>
          </div>
          <div className="timeline">
            {stats.activityLogs.length === 0 && <p className="muted">No activity yet.</p>}
            {stats.activityLogs.map((log) => (
              <div className="timeline-item" key={log.id}>
                <span className="dot" />
                <strong>{log.action.replaceAll('_', ' ')}</strong>
                <p>{log.message}</p>
                <small>{log.project.name} • {formatDate(log.createdAt)}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h3>Due Soon</h3>
          <span>next 7 days</span>
        </div>
        <div className="task-list compact cards-inline">
          {stats.dueSoon.length === 0 && <p className="muted">No deadlines in the next 7 days.</p>}
          {stats.dueSoon.map((task) => (
            <article className="mini-task" key={task.id}>
              <span className={`pill ${statusClass(task.status)}`}>{task.status.replace('_', ' ')}</span>
              <h4>{task.title}</h4>
              <p>{task.project.name}</p>
              <small>Due {formatDate(task.dueDate)}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
