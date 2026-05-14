import { prisma } from '../lib/prisma.js';
import { AppError } from './appError.js';

export async function getMembership(projectId, userId) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { project: true }
  });
}

export async function requireProjectMember(projectId, userId) {
  const membership = await getMembership(projectId, userId);
  if (!membership) {
    throw new AppError('You are not a member of this project.', 403);
  }
  return membership;
}

export async function requireProjectAdmin(projectId, userId) {
  const membership = await requireProjectMember(projectId, userId);
  if (membership.role !== 'ADMIN') {
    throw new AppError('Only project admins can perform this action.', 403);
  }
  return membership;
}
