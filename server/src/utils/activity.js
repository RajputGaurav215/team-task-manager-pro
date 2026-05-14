import { prisma } from '../lib/prisma.js';

export async function logActivity({ projectId, userId, action, message, entityType, entityId }) {
  try {
    await prisma.activityLog.create({
      data: {
        projectId,
        userId: userId || null,
        action,
        message,
        entityType,
        entityId: entityId || null
      }
    });
  } catch (error) {
    // Activity logging should never break the main user action.
    console.error('Activity log failed:', error.message);
  }
}
