# TeamFlow Pro - Team Task Manager

A production-style full-stack Team Task Management Web Application built for the assignment requirement: authentication, project/team management, task assignment, status tracking, dashboard analytics, Admin/Member role-based access control, REST APIs, PostgreSQL database relationships, and Railway deployment.

## Pro Improvements Added

### Frontend
- Modern responsive glassmorphism UI
- Dark/light mode toggle
- Interactive dashboard with charts, KPI cards, progress ring, overdue section, due-soon tasks, and activity feed
- Project search and role filters
- Project progress cards with member avatars and task summaries
- Kanban board with drag-and-drop task status updates
- Task quick comments
- Sticky task filters: search, status, priority
- Skeleton loaders and toast-style success/error messages

### Backend
- JWT authentication with bcrypt password hashing
- Strong Admin/Member RBAC rules
- Prisma + PostgreSQL relational schema
- Zod validation for request bodies
- Centralized error handling
- Helmet security headers
- Express rate limiting
- Task filtering, searching, sorting, and pagination support
- Activity audit logs for project, member, task, status, and comment actions
- Task comments API
- Railway-ready production start command

## Tech Stack

- Frontend: React + Vite + Recharts
- Backend: Node.js + Express
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT + bcryptjs
- Validation: Zod
- Deployment: Railway

## Folder Structure

```txt
team-task-manager-ultra-pro/
├── client/                 # React frontend
│   └── src/
│       ├── components/
│       ├── context/
│       ├── lib/
│       └── pages/
├── server/                 # Express backend
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── utils/
│       └── index.js
├── docker-compose.yml
├── railway.json
└── package.json
```

## Local Setup

### 1. Install packages

```bash
npm install
```

### 2. Create environment file

Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env -Force
```

Mac/Linux/Git Bash:

```bash
cp server/.env.example server/.env
```

Your `server/.env` should contain:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/team_task_manager?schema=public"
JWT_SECRET="local-super-secret-change-in-production"
CLIENT_URL="http://localhost:5173"
PORT=5000
```

### 3. Start PostgreSQL using Docker

Open Docker Desktop first, then run:

```bash
npm run db:up
```

### 4. Run migrations

```bash
npm run db:migrate
```

### 5. Generate Prisma client

```bash
npm run prisma:generate
```

### 6. Seed demo data

```bash
npm run seed
```

### 7. Start app

```bash
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Demo Accounts

```txt
Admin: admin@example.com
Password: Pass1234
```

```txt
Member: member@example.com
Password: Pass1234
```

```txt
Designer: designer@example.com
Password: Pass1234
```

## Main API Routes

### Auth

```txt
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
```

### Projects

```txt
GET    /api/projects
POST   /api/projects
POST   /api/projects/join
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
POST   /api/projects/:projectId/members
PATCH  /api/projects/:projectId/members/:userId
DELETE /api/projects/:projectId/members/:userId
```

### Tasks

```txt
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:taskId
PATCH  /api/tasks/:taskId
POST   /api/tasks/:taskId/comments
DELETE /api/tasks/:taskId
```

### Dashboard

```txt
GET /api/dashboard
```

## RBAC Rules

### Admin
- Create/update/delete project
- Add/remove members
- Change member roles
- Create/delete tasks
- Assign tasks to project members
- Update all project tasks
- View project-wide dashboard and activity

### Member
- View joined projects
- View assigned tasks only
- Update status of assigned tasks only
- Comment on assigned tasks

## Railway Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "TeamFlow Pro full-stack task manager"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Create Railway project

1. Go to Railway
2. New Project
3. Deploy from GitHub Repo
4. Select this repository
5. Add PostgreSQL database service

### 3. Add environment variables in Railway

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=make-this-a-long-random-secret
NODE_ENV=production
```

### 4. Build and Start

The included `railway.json` and `package.json` are already configured.

Production flow:

```txt
npm install
npm run build
npm start
```

The backend serves the React production build from `client/dist`, so Railway deploys this as one full-stack service.

## Submission Checklist

- [ ] Live Railway URL
- [ ] GitHub repo URL
- [ ] README included
- [ ] 2-5 minute demo video
- [ ] Demo accounts tested
- [ ] Signup/login tested
- [ ] Project create/join tested
- [ ] Admin/member RBAC tested
- [ ] Task create/assign/update tested
- [ ] Dashboard tested

## Demo Video Script

1. Introduce TeamFlow Pro as a full-stack task manager.
2. Show signup/login.
3. Login as Admin.
4. Create a project.
5. Add a member by email.
6. Create tasks with title, description, due date, priority, and assignee.
7. Show Kanban drag-and-drop status update.
8. Add a task comment.
9. Open dashboard and explain total tasks, status chart, overdue tasks, due soon tasks, and activity feed.
10. Login as Member and show restricted access: member can only view/update assigned tasks.
11. Show Railway live URL and GitHub repository.


## Password Reset Flow

This upgraded version includes a complete demo password-reset flow:

1. Open `/forgot-password` from the Login page.
2. Enter a registered email address.
3. The backend creates a one-time token, stores only its SHA-256 hash in PostgreSQL, and expires it after 15 minutes.
4. Because this assignment project has no email provider connected, the reset link is shown on screen for demo/testing.
5. Open the reset link, set a new password, then login again.

For real production use, connect an email provider such as SendGrid, Mailgun, Resend, or Nodemailer and email the generated reset URL instead of showing it in the UI.

## Can anyone create a new account?

Yes. Any new user can register from the Signup page using name, email, and password. Emails are unique. After signup, the user can create a new project and automatically becomes that project's Admin, or they can join an existing project using an invite code shared by a project Admin.
