import { prisma } from '../lib/prisma.js';

function statusLabel(status) {
  return status.replace('_', ' ');
}

export async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;

    const projects = await prisma.project.findMany({
      where: { members: { some: { userId } } },
      select: { id: true }
    });
    const projectIds = projects.map((project) => project.id);

    const adminMemberships = await prisma.projectMember.findMany({
      where: { userId, role: 'ADMIN' },
      select: { projectId: true }
    });
    const adminProjectIds = adminMemberships.map((membership) => membership.projectId);

    const taskWhere = {
      OR: [
        { projectId: { in: adminProjectIds } },
        { assignedToId: userId }
      ]
    };

    const [tasks, memberships, activityLogs] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } }
        },
        orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }]
      }),
      prisma.projectMember.findMany({
        where: { projectId: { in: projectIds } },
        include: { user: { select: { id: true, name: true, email: true } } }
      }),
      prisma.activityLog.findMany({
        where: { projectId: { in: projectIds } },
        include: { user: { select: { id: true, name: true, email: true } }, project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const totalTasks = tasks.length;
    const completedCount = tasks.filter((task) => task.status === 'DONE').length;
    const overdueTasks = tasks.filter((task) => task.status !== 'DONE' && new Date(task.dueDate) < new Date());
    const highPriorityOpen = tasks.filter((task) => task.priority === 'HIGH' && task.status !== 'DONE').length;
    const completionRate = totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0;

    const byStatus = ['TODO', 'IN_PROGRESS', 'DONE'].map((status) => ({
      name: statusLabel(status),
      value: tasks.filter((task) => task.status === status).length
    }));

    const byPriority = ['LOW', 'MEDIUM', 'HIGH'].map((priority) => ({
      name: priority,
      value: tasks.filter((task) => task.priority === priority).length
    }));

    const tasksPerUserMap = new Map();
    memberships.forEach((membership) => {
      if (!tasksPerUserMap.has(membership.user.id)) {
        tasksPerUserMap.set(membership.user.id, { name: membership.user.name, value: 0 });
      }
    });
    tasks.forEach((task) => {
      tasksPerUserMap.set(task.assignedTo.id, {
        name: task.assignedTo.name,
        value: (tasksPerUserMap.get(task.assignedTo.id)?.value || 0) + 1
      });
    });

    const today = new Date();
    const nextSevenDays = new Date();
    nextSevenDays.setDate(today.getDate() + 7);

    const dueSoon = tasks.filter((task) => {
      const dueDate = new Date(task.dueDate);
      return task.status !== 'DONE' && dueDate >= today && dueDate <= nextSevenDays;
    });

    res.json({
      success: true,
      stats: {
        totalProjects: projects.length,
        totalTasks,
        overdueCount: overdueTasks.length,
        completedCount,
        highPriorityOpen,
        completionRate,
        byStatus,
        byPriority,
        tasksPerUser: Array.from(tasksPerUserMap.values()).filter((item) => item.value > 0),
        overdueTasks: overdueTasks.slice(0, 8),
        dueSoon: dueSoon.slice(0, 8),
        recentTasks: [...tasks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 8),
        activityLogs
      }
    });
  } catch (error) {
    next(error);
  }
}
