import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';
import { getMembership, requireProjectAdmin, requireProjectMember } from '../utils/projectAccess.js';
import { logActivity } from '../utils/activity.js';
import { buildMeta, getPagination } from '../utils/query.js';

const createTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(3, 'Task title must be at least 3 characters.').max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  dueDate: z.coerce.date(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  assignedToId: z.string().min(1),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional()
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  dueDate: z.coerce.date().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assignedToId: z.string().min(1).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional()
});

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty.').max(600)
});

function includeTaskDetails() {
  return {
    project: { select: { id: true, name: true } },
    assignedTo: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true, email: true } },
    comments: {
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    },
    _count: { select: { comments: true } }
  };
}

export async function listTasks(req, res, next) {
  try {
    const { projectId, status, assignedToMe, priority, search, due } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const userId = req.user.id;

    const baseWhere = projectId
      ? { projectId }
      : {
          OR: [
            { project: { members: { some: { userId, role: 'ADMIN' } } } },
            { assignedToId: userId }
          ]
        };

    if (projectId) {
      const membership = await requireProjectMember(projectId, userId);
      if (membership.role !== 'ADMIN') baseWhere.assignedToId = userId;
    }

    const dueFilter = due === 'overdue'
      ? { dueDate: { lt: new Date() }, status: { not: 'DONE' } }
      : due === 'upcoming'
        ? { dueDate: { gte: new Date() } }
        : {};

    const where = {
      ...baseWhere,
      ...dueFilter,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(assignedToMe === 'true' ? { assignedToId: userId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: includeTaskDetails(),
        orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }],
        skip,
        take: limit
      }),
      prisma.task.count({ where })
    ]);

    res.json({ success: true, tasks, meta: buildMeta({ page, limit, total }) });
  } catch (error) {
    next(error);
  }
}

export async function getTask(req, res, next) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: includeTaskDetails()
    });
    if (!task) throw new AppError('Task not found.', 404);

    const membership = await requireProjectMember(task.projectId, req.user.id);
    if (membership.role !== 'ADMIN' && task.assignedToId !== req.user.id) {
      throw new AppError('Members can view only assigned tasks.', 403);
    }

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
}

export async function createTask(req, res, next) {
  try {
    const data = createTaskSchema.parse(req.body);
    await requireProjectAdmin(data.projectId, req.user.id);

    const assigneeMembership = await getMembership(data.projectId, data.assignedToId);
    if (!assigneeMembership) {
      throw new AppError('Assignee must be a member of this project.', 400);
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        dueDate: data.dueDate,
        priority: data.priority,
        status: data.status || 'TODO',
        projectId: data.projectId,
        assignedToId: data.assignedToId,
        createdById: req.user.id
      },
      include: includeTaskDetails()
    });

    await logActivity({
      projectId: data.projectId,
      userId: req.user.id,
      action: 'TASK_CREATED',
      message: `${req.user.name} created task “${task.title}”`,
      entityType: 'TASK',
      entityId: task.id
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req, res, next) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { assignedTo: true }
    });
    if (!task) throw new AppError('Task not found.', 404);

    const membership = await requireProjectMember(task.projectId, req.user.id);
    const data = updateTaskSchema.parse(req.body);

    if (membership.role !== 'ADMIN') {
      if (task.assignedToId !== req.user.id) {
        throw new AppError('Members can update only their assigned tasks.', 403);
      }

      const allowedKeys = ['status'];
      const requestedKeys = Object.keys(data);
      const invalidKey = requestedKeys.find((key) => !allowedKeys.includes(key));
      if (invalidKey) throw new AppError('Members can update task status only.', 403);
    }

    if (data.assignedToId) {
      await requireProjectAdmin(task.projectId, req.user.id);
      const assigneeMembership = await getMembership(task.projectId, data.assignedToId);
      if (!assigneeMembership) throw new AppError('Assignee must be a member of this project.', 400);
    }

    const updatedTask = await prisma.task.update({
      where: { id: req.params.taskId },
      data,
      include: includeTaskDetails()
    });

    const message = data.status && data.status !== task.status
      ? `${req.user.name} moved “${task.title}” from ${task.status.replace('_', ' ')} to ${data.status.replace('_', ' ')}`
      : `${req.user.name} updated task “${task.title}”`;

    await logActivity({
      projectId: task.projectId,
      userId: req.user.id,
      action: data.status ? 'TASK_STATUS_UPDATED' : 'TASK_UPDATED',
      message,
      entityType: 'TASK',
      entityId: task.id
    });

    res.json({ success: true, task: updatedTask });
  } catch (error) {
    next(error);
  }
}

export async function addTaskComment(req, res, next) {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw new AppError('Task not found.', 404);

    const membership = await requireProjectMember(task.projectId, req.user.id);
    if (membership.role !== 'ADMIN' && task.assignedToId !== req.user.id) {
      throw new AppError('Members can comment only on assigned tasks.', 403);
    }

    const data = commentSchema.parse(req.body);
    const comment = await prisma.taskComment.create({
      data: {
        body: data.body,
        taskId: task.id,
        userId: req.user.id
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    await logActivity({
      projectId: task.projectId,
      userId: req.user.id,
      action: 'COMMENT_ADDED',
      message: `${req.user.name} commented on “${task.title}”`,
      entityType: 'TASK',
      entityId: task.id
    });

    res.status(201).json({ success: true, comment });
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req, res, next) {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw new AppError('Task not found.', 404);

    await requireProjectAdmin(task.projectId, req.user.id);
    await prisma.task.delete({ where: { id: req.params.taskId } });

    await logActivity({
      projectId: task.projectId,
      userId: req.user.id,
      action: 'TASK_DELETED',
      message: `${req.user.name} deleted task “${task.title}”`,
      entityType: 'TASK',
      entityId: task.id
    });

    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
