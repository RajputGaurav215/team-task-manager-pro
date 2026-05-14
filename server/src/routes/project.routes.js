import { Router } from 'express';
import {
  addMember,
  createProject,
  deleteProject,
  getProject,
  joinProject,
  listProjects,
  removeMember,
  updateMemberRole,
  updateProject
} from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listProjects);
router.post('/', createProject);
router.post('/join', joinProject);
router.get('/:projectId', getProject);
router.patch('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);
router.post('/:projectId/members', addMember);
router.patch('/:projectId/members/:userId', updateMemberRole);
router.delete('/:projectId/members/:userId', removeMember);

export default router;
