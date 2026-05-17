import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function AuthVisual() {
  return (
    <div className="auth-visual" aria-hidden="true">
      <div className="floating-card card-one">
        <span>New Project</span>
        <strong>Admin</strong>
        <small>auto role</small>
      </div>

      <div className="floating-card card-two">
        <span>Invite Code</span>
        <strong>Ready</strong>
        <small>team join</small>
      </div>

      <div className="kanban-preview">
        <div>
          <b>Create</b>
          <i />
        </div>
        <div>
          <b>Assign</b>
          <i />
        </div>
        <div>
          <b>Track</b>
          <i />
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!name || !email || !password) {
      setError("Name, email and password are required.");
      return;
    }

    if (name.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await signup(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <span className="badge">Professional Assignment Build</span>

        <h1>Create your own team workspace with a premium interface.</h1>

        <p>
          Every new user can signup, create a project, become Admin, invite
          members, assign work, and track progress from a visual dashboard.
        </p>

        <AuthVisual />
      </section>

      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="form-kicker">New Workspace</span>

        <h2>Create account</h2>

        <p>Signup with name, email and password</p>

        {error && <div className="alert error">{error}</div>}

        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          required
          minLength={2}
          placeholder="Your name"
          autoComplete="name"
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="you@example.com"
          autoComplete="email"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
          placeholder="Minimum 6 characters"
          autoComplete="new-password"
        />

        <button className="btn btn-primary full" disabled={loading}>
          {loading ? "Creating..." : "Launch Workspace"}
        </button>

        <small>
          Already have an account? <Link to="/login">Login</Link>
        </small>
      </form>
    </div>
  );
}
