import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Pass1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@example.com', password }
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: { name: 'Member User', email: 'member@example.com', password }
  });

  const designer = await prisma.user.upsert({
    where: { email: 'designer@example.com' },
    update: {},
    create: { name: 'Design Lead', email: 'designer@example.com', password }
  });

  const project = await prisma.project.upsert({
    where: { inviteCode: 'DEMO123' },
    update: {},
    create: {
      name: 'Website Redesign',
      description: 'Launch a polished dashboard for team operations and client reporting.',
      inviteCode: 'DEMO123',
      createdById: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: member.id, role: 'MEMBER' },
          { userId: designer.id, role: 'MEMBER' }
        ]
      }
    }
  });

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  const overdue = new Date(now);
  overdue.setDate(now.getDate() - 2);

  const task1 = await prisma.task.upsert({
    where: { id: 'seed-task-dashboard' },
    update: {},
    create: {
      id: 'seed-task-dashboard',
      title: 'Design dashboard analytics cards',
      description: 'Create responsive KPI cards with progress, overdue, and priority indicators.',
      dueDate: tomorrow,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      projectId: project.id,
      assignedToId: designer.id,
      createdById: admin.id
    }
  });

  const task2 = await prisma.task.upsert({
    where: { id: 'seed-task-api' },
    update: {},
    create: {
      id: 'seed-task-api',
      title: 'Harden task REST APIs',
      description: 'Add validations, RBAC checks, filtering, pagination, and activity logs.',
      dueDate: nextWeek,
      priority: 'HIGH',
      status: 'TODO',
      projectId: project.id,
      assignedToId: admin.id,
      createdById: admin.id
    }
  });

  const task3 = await prisma.task.upsert({
    where: { id: 'seed-task-overdue' },
    update: {},
    create: {
      id: 'seed-task-overdue',
      title: 'Prepare README deployment guide',
      description: 'Document local setup, Railway deployment, env variables, and demo credentials.',
      dueDate: overdue,
      priority: 'MEDIUM',
      status: 'TODO',
      projectId: project.id,
      assignedToId: member.id,
      createdById: admin.id
    }
  });

  await prisma.taskComment.createMany({
    data: [
      { taskId: task1.id, userId: admin.id, body: 'Please keep this section clean and recruiter-friendly.' },
      { taskId: task1.id, userId: designer.id, body: 'I added a glass UI direction with responsive cards.' },
      { taskId: task3.id, userId: member.id, body: 'I will update Railway steps after testing locally.' }
    ],
    skipDuplicates: true
  });

  await prisma.activityLog.createMany({
    data: [
      {
        projectId: project.id,
        userId: admin.id,
        action: 'PROJECT_CREATED',
        message: 'Admin User created project Website Redesign',
        entityType: 'PROJECT',
        entityId: project.id
      },
      {
        projectId: project.id,
        userId: admin.id,
        action: 'TASK_CREATED',
        message: 'Admin User created task “Harden task REST APIs”',
        entityType: 'TASK',
        entityId: task2.id
      },
      {
        projectId: project.id,
        userId: designer.id,
        action: 'COMMENT_ADDED',
        message: 'Design Lead commented on “Design dashboard analytics cards”',
        entityType: 'TASK',
        entityId: task1.id
      }
    ],
    skipDuplicates: true
  });

  console.log('Seed complete.');
  console.log('Admin: admin@example.com / Pass1234');
  console.log('Member: member@example.com / Pass1234');
  console.log('Designer: designer@example.com / Pass1234');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
