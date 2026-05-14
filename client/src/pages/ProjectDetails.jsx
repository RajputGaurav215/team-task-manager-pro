import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

const COLUMNS = [
  { key: 'TODO', label: 'To Do', emoji: '📝' },
  { key: 'IN_PROGRESS', label: 'In Progress', emoji: '⚡' },
  { key: 'DONE', label: 'Done', emoji: '✅' }
];

function toInputDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(date) {
  return new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function statusText(status) {
  return status.replace('_', ' ');
}

function priorityScore(priority) {
  return { HIGH: 3, MEDIUM: 2, LOW: 1 }[priority] || 0;
}

function TaskCard({ task, isAdmin, userId, onStatusChange, onDelete, onComment, commentValue, onCommentChange }) {
  const overdue = task.status !== 'DONE' && new Date(task.dueDate) < new Date();
  const canUpdateStatus = isAdmin || task.assignedToId === userId;

  return (
    <article
      className={`kanban-task ${overdue ? 'is-overdue' : ''}`}
      draggable={canUpdateStatus}
      onDragStart={(event) => {
        event.dataTransfer.setData('taskId', task.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="task-title-row">
        <h4>{task.title}</h4>
        <span className={`pill priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
      </div>
      <p>{task.description || 'No description added.'}</p>

      <div className="task-meta-grid">
        <span>👤 {task.assignedTo.name}</span>
        <span className={overdue ? 'danger-text' : ''}>📅 {formatDate(task.dueDate)}</span>
        <span>💬 {task._count?.comments || task.comments?.length || 0}</span>
      </div>

      <div className="task-actions split">
        <select value={task.status} onChange={(e) => onStatusChange(task.id, e.target.value)} disabled={!canUpdateStatus}>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
        {isAdmin && <button className="icon-btn danger-text" type="button" onClick={() => onDelete(task.id)}>Delete</button>}
      </div>

      <div className="comment-panel">
        <strong>Latest comments</strong>
        <div className="comment-list">
          {(task.comments || []).slice(0, 2).map((comment) => (
            <div className="comment" key={comment.id}>
              <span>{initials(comment.user.name)}</span>
              <p>{comment.body}</p>
            </div>
          ))}
          {(!task.comments || task.comments.length === 0) && <small className="muted">No comments yet.</small>}
        </div>
        <form onSubmit={(event) => onComment(event, task.id)} className="comment-form">
          <input
            value={commentValue || ''}
            onChange={(e) => onCommentChange(task.id, e.target.value)}
            placeholder="Add quick comment..."
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </article>
  );
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'MEMBER' });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: toInputDate(Date.now() + 24 * 60 * 60 * 1000),
    priority: 'MEDIUM',
    assignedToId: ''
  });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});

  const isAdmin = project?.currentUserRole === 'ADMIN';

  const filteredTasks = useMemo(() => {
    if (!project) return [];
    return project.tasks
      .filter((task) => statusFilter === 'ALL' || task.status === statusFilter)
      .filter((task) => priorityFilter === 'ALL' || task.priority === priorityFilter)
      .filter((task) => `${task.title} ${task.description || ''} ${task.assignedTo.name}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority) || new Date(a.dueDate) - new Date(b.dueDate));
  }, [project, priorityFilter, search, statusFilter]);

  async function loadProject() {
    setLoading(true);
    setError('');
    try {
      const data = await api(`/projects/${projectId}`);
      setProject(data.project);
      const firstMember = data.project.members?.[0]?.userId || '';
      setTaskForm((prev) => ({ ...prev, assignedToId: prev.assignedToId || firstMember }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function notify(text) {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2500);
  }

  async function addMember(event) {
    event.preventDefault();
    setError('');
    try {
      await api(`/projects/${projectId}/members`, { method: 'POST', body: memberForm });
      setMemberForm({ email: '', role: 'MEMBER' });
      notify('Member added successfully.');
      await loadProject();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeMember(userId) {
    if (!confirm('Remove this member from project?')) return;
    setError('');
    try {
      await api(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
      notify('Member removed successfully.');
      await loadProject();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeMemberRole(userId, role) {
    setError('');
    try {
      await api(`/projects/${projectId}/members/${userId}`, { method: 'PATCH', body: { role } });
      notify('Member role updated.');
      await loadProject();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createTask(event) {
    event.preventDefault();
    setError('');
    try {
      await api('/tasks', {
        method: 'POST',
        body: { ...taskForm, projectId, dueDate: new Date(taskForm.dueDate).toISOString() }
      });
      setTaskForm({
        title: '',
        description: '',
        dueDate: toInputDate(Date.now() + 24 * 60 * 60 * 1000),
        priority: 'MEDIUM',
        assignedToId: project.members?.[0]?.userId || ''
      });
      notify('Task created successfully.');
      await loadProject();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateTaskStatus(taskId, status) {
    setError('');
    try {
      await api(`/tasks/${taskId}`, { method: 'PATCH', body: { status } });
      notify(`Task moved to ${statusText(status)}.`);
      await loadProject();
    } catch (err) {
      setError(err.message);
    }
  }

  async function dropTask(event, status) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('taskId');
    if (!taskId) return;
    const task = project.tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    await updateTaskStatus(taskId, status);
  }

  async function addComment(event, taskId) {
    event.preventDefault();
    const body = commentDrafts[taskId]?.trim();
    if (!body) return;
    setError('');
    try {
      await api(`/tasks/${taskId}/comments`, { method: 'POST', body: { body } });
      setCommentDrafts((current) => ({ ...current, [taskId]: '' }));
      notify('Comment added.');
      await loadProject();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(taskId) {
    if (!confirm('Delete this task permanently?')) return;
    setError('');
    try {
      await api(`/tasks/${taskId}`, { method: 'DELETE' });
      notify('Task deleted successfully.');
      await loadProject();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton hero-skeleton" />
        <div className="grid-3">{Array.from({ length: 3 }).map((_, index) => <div className="skeleton card" key={index} />)}</div>
      </div>
    );
  }
  if (!project) return <div className="alert error">Project not found.</div>;

  const summary = project.taskSummary || { total: 0, done: 0, overdue: 0, progress: 0 };

  return (
    <div className="page fade-in">
      <Link className="back-link" to="/projects">← Back to Projects</Link>

      <section className="project-hero">
        <div>
          <span className="eyebrow">{project.currentUserRole} Workspace</span>
          <h1>{project.name}</h1>
          <p>{project.description || 'No description provided.'}</p>
          <div className="project-hero-meta">
            <span>Invite Code: <strong>{project.inviteCode}</strong></span>
            <span>{project.members.length} Members</span>
            <span>{summary.total} Tasks</span>
          </div>
        </div>
        <div className="hero-progress">
          <div className="ring" style={{ '--value': `${summary.progress}%` }}><span>{summary.progress}%</span></div>
          <strong>Project Progress</strong>
        </div>
      </section>

      {error && <div className="alert error sticky-alert">{error}</div>}
      {message && <div className="alert success sticky-alert">{message}</div>}

      <section className="stats-grid project-stats">
        <article className="stat-card"><span>Total</span><strong>{summary.total}</strong><small>project tasks</small></article>
        <article className="stat-card warning"><span>In Progress</span><strong>{summary.inProgress}</strong><small>active tasks</small></article>
        <article className="stat-card success"><span>Done</span><strong>{summary.done}</strong><small>completed</small></article>
        <article className="stat-card danger"><span>Overdue</span><strong>{summary.overdue}</strong><small>pending after due date</small></article>
      </section>

      <section className="grid-3 align-start">
        <div className="card span-2">
          <div className="section-title">
            <h3>{isAdmin ? 'Create Task' : 'Your Access'}</h3>
            <span className="pill neutral">{project.currentUserRole}</span>
          </div>
          {isAdmin ? (
            <form className="pro-form" onSubmit={createTask}>
              <div className="form-row">
                <div>
                  <label>Title</label>
                  <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required minLength="3" placeholder="Task title" />
                </div>
                <div>
                  <label>Assign To</label>
                  <select value={taskForm.assignedToId} onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })} required>
                    {project.members.map((member) => <option value={member.userId} key={member.userId}>{member.user.name} ({member.role})</option>)}
                  </select>
                </div>
              </div>
              <label>Description</label>
              <textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows="3" placeholder="What needs to be done?" />
              <div className="form-row">
                <div>
                  <label>Due Date</label>
                  <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} required />
                </div>
                <div>
                  <label>Priority</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary">Create Task</button>
            </form>
          ) : (
            <div className="empty-state mini">Members can view their assigned work and update status only. Admin controls team and task management.</div>
          )}
        </div>

        <div className="card">
          <div className="section-title">
            <h3>Team Members</h3>
            <span>{project.members.length} total</span>
          </div>
          <div className="member-list pro-members">
            {project.members.map((member) => (
              <div className="member-row" key={member.id}>
                <div className="avatar small">{initials(member.user.name)}</div>
                <div className="member-info">
                  <strong>{member.user.name}</strong>
                  <span>{member.user.email}</span>
                </div>
                {isAdmin ? (
                  <select
                    value={member.role}
                    onChange={(e) => changeMemberRole(member.userId, e.target.value)}
                    disabled={member.userId === user.id && project.members.filter((m) => m.role === 'ADMIN').length <= 1}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                ) : (
                  <span className="pill neutral">{member.role}</span>
                )}
                {isAdmin && member.userId !== user.id && <button className="icon-btn danger-text" type="button" onClick={() => removeMember(member.userId)}>Remove</button>}
              </div>
            ))}
          </div>

          {isAdmin && (
            <form className="inline-form stacked" onSubmit={addMember}>
              <input type="email" placeholder="member@email.com" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} required />
              <div className="form-row compact">
                <select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button className="btn btn-secondary">Add</button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="toolbar card soft-card sticky-toolbar">
        <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, assignees, descriptions..." />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All status</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="ALL">All priority</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </section>

      <section className="kanban-board">
        {COLUMNS.map((column) => {
          const tasks = filteredTasks.filter((task) => task.status === column.key);
          return (
            <div
              className="kanban-column"
              key={column.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropTask(event, column.key)}
            >
              <div className="column-header">
                <h3>{column.emoji} {column.label}</h3>
                <span>{tasks.length}</span>
              </div>
              <div className="column-body">
                {tasks.length === 0 && <div className="empty-drop">Drop tasks here</div>}
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isAdmin={isAdmin}
                    userId={user.id}
                    onStatusChange={updateTaskStatus}
                    onDelete={deleteTask}
                    onComment={addComment}
                    commentValue={commentDrafts[task.id]}
                    onCommentChange={(taskId, value) => setCommentDrafts((current) => ({ ...current, [taskId]: value }))}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="card">
        <div className="section-title">
          <h3>Project Activity</h3>
          <span>audit trail</span>
        </div>
        <div className="timeline wide">
          {project.activityLogs.length === 0 && <p className="muted">No activity yet.</p>}
          {project.activityLogs.map((log) => (
            <div className="timeline-item" key={log.id}>
              <span className="dot" />
              <strong>{log.action.replaceAll('_', ' ')}</strong>
              <p>{log.message}</p>
              <small>{log.user?.name || 'System'} • {formatDateTime(log.createdAt)}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
