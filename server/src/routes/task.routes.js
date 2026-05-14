import { Router } from 'express';
import {
  addTaskComment,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask
} from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listTasks);
router.post('/', createTask);
router.get('/:taskId', getTask);
router.patch('/:taskId', updateTask);
router.post('/:taskId/comments', addTaskComment);
router.delete('/:taskId', deleteTask);

export default router;
