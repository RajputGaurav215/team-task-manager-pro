import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';
import { generateInviteCode } from '../utils/generateInviteCode.js';
import { requireProjectAdmin, requireProjectMember } from '../utils/projectAccess.js';
import { logActivity } from '../utils/activity.js';

const projectSchema = z.object({
  name: z.string().trim().min(3, 'Project name must be at least 3 characters.').max(80),
  description: z.string().trim().max(500).optional().nullable()
});

const memberSchema = z.object({
  email: z.string().trim().email('Please enter a valid email.'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER')
});

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER'])
});

const joinSchema = z.object({
  inviteCode: z.string().trim().min(5).max(20)
});

function taskCounts(tasks = []) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === 'DONE').length;
  const todo = tasks.filter((task) => task.status === 'TODO').length;
  const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
  const overdue = tasks.filter((task) => task.status !== 'DONE' && new Date(task.dueDate) < new Date()).length;
  return {
    total,
    done,
    todo,
    inProgress,
    overdue,
    progress: total ? Math.round((done / total) * 100) : 0
  };
}

export async function listProjects(req, res, next) {
  try {
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: 'asc' }
        },
        tasks: { select: { id: true, status: true, dueDate: true } },
        _count: { select: { tasks: true, members: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const enrichedProjects = projects.map((project) => ({
      ...project,
      taskSummary: taskCounts(project.tasks),
      tasks: undefined
    }));

    res.json({ success: true, projects: enrichedProjects });
  } catch (error) {
    next(error);
  }
}

export async function createProject(req, res, next) {
  try {
    const data = projectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null,
        inviteCode: generateInviteCode(),
        createdById: req.user.id,
        members: {
          create: { userId: req.user.id, role: 'ADMIN' }
        }
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { tasks: true, members: true } }
      }
    });

    await logActivity({
      projectId: project.id,
      userId: req.user.id,
      action: 'PROJECT_CREATED',
      message: `${req.user.name} created project ${project.name}`,
      entityType: 'PROJECT',
      entityId: project.id
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
}

export async function getProject(req, res, next) {
  try {
    await requireProjectMember(req.params.projectId, req.user.id);

    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }]
        },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            comments: {
              include: { user: { select: { id: true, name: true, email: true } } },
              orderBy: { createdAt: 'desc' },
              take: 5
            },
            _count: { select: { comments: true } }
          },
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }]
        },
        activityLogs: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 12
        }
      }
    });

    if (!project) throw new AppError('Project not found.', 404);

    const requesterMembership = project.members.find((m) => m.userId === req.user.id);
    const visibleTasks = requesterMembership?.role === 'ADMIN'
      ? project.tasks
      : project.tasks.filter((task) => task.assignedToId === req.user.id);

    const visibleProject = {
      ...project,
      tasks: visibleTasks,
      taskSummary: taskCounts(visibleTasks),
      currentUserRole: requesterMembership?.role
    };

    res.json({ success: true, project: visibleProject });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req, res, next) {
  try {
    await requireProjectAdmin(req.params.projectId, req.user.id);
    const data = projectSchema.partial().parse(req.body);

    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {})
      }
    });

    await logActivity({
      projectId: project.id,
      userId: req.user.id,
      action: 'PROJECT_UPDATED',
      message: `${req.user.name} updated project details`,
      entityType: 'PROJECT',
      entityId: project.id
    });

    res.json({ success: true, project });
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req, res, next) {
  try {
    await requireProjectAdmin(req.params.projectId, req.user.id);
    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function joinProject(req, res, next) {
  try {
    const data = joinSchema.parse(req.body);
    const project = await prisma.project.findUnique({ where: { inviteCode: data.inviteCode.toUpperCase() } });
    if (!project) throw new AppError('Invalid invite code.', 404);

    const membership = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: req.user.id } },
      update: {},
      create: { projectId: project.id, userId: req.user.id, role: 'MEMBER' }
    });

    await logActivity({
      projectId: project.id,
      userId: req.user.id,
      action: 'MEMBER_JOINED',
      message: `${req.user.name} joined the project`,
      entityType: 'MEMBER',
      entityId: membership.id
    });

    res.status(201).json({ success: true, message: 'Joined project successfully.', projectId: project.id });
  } catch (error) {
    next(error);
  }
}

export async function addMember(req, res, next) {
  try {
    await requireProjectAdmin(req.params.projectId, req.user.id);
    const data = memberSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user) throw new AppError('No user found with this email. Ask them to signup first.', 404);

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: req.params.projectId, userId: user.id } },
      update: { role: data.role },
      create: { projectId: req.params.projectId, userId: user.id, role: data.role },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    await logActivity({
      projectId: req.params.projectId,
      userId: req.user.id,
      action: 'MEMBER_ADDED',
      message: `${req.user.name} added ${user.name} as ${data.role}`,
      entityType: 'MEMBER',
      entityId: user.id
    });

    res.status(201).json({ success: true, member });
  } catch (error) {
    next(error);
  }
}

export async function updateMemberRole(req, res, next) {
  try {
    await requireProjectAdmin(req.params.projectId, req.user.id);
    const data = updateRoleSchema.parse(req.body);

    const adminCount = await prisma.projectMember.count({
      where: { projectId: req.params.projectId, role: 'ADMIN' }
    });

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.projectId, userId: req.params.userId } },
      include: { user: true }
    });

    if (!existing) throw new AppError('Member not found in project.', 404);
    if (existing.role === 'ADMIN' && data.role === 'MEMBER' && adminCount <= 1) {
      throw new AppError('Project must have at least one admin.', 400);
    }

    const member = await prisma.projectMember.update({
      where: { projectId_userId: { projectId: req.params.projectId, userId: req.params.userId } },
      data: { role: data.role },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    await logActivity({
      projectId: req.params.projectId,
      userId: req.user.id,
      action: 'ROLE_UPDATED',
      message: `${req.user.name} changed ${existing.user.name}'s role to ${data.role}`,
      entityType: 'MEMBER',
      entityId: req.params.userId
    });

    res.json({ success: true, member });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req, res, next) {
  try {
    await requireProjectAdmin(req.params.projectId, req.user.id);

    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) throw new AppError('Project not found.', 404);
    if (project.createdById === req.params.userId) {
      throw new AppError('Project creator cannot be removed.', 400);
    }

    const adminCount = await prisma.projectMember.count({
      where: { projectId: req.params.projectId, role: 'ADMIN' }
    });
    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.projectId, userId: req.params.userId } },
      include: { user: true }
    });

    if (!existing) throw new AppError('Member not found in project.', 404);
    if (existing.role === 'ADMIN' && adminCount <= 1) {
      throw new AppError('Project must have at least one admin.', 400);
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: req.params.projectId, userId: req.params.userId } }
    });

    await logActivity({
      projectId: req.params.projectId,
      userId: req.user.id,
      action: 'MEMBER_REMOVED',
      message: `${req.user.name} removed ${existing.user.name} from the project`,
      entityType: 'MEMBER',
      entityId: req.params.userId
    });

    res.json({ success: true, message: 'Member removed successfully.' });
  } catch (error) {
    next(error);
  }
}
