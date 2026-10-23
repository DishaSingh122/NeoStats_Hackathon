import express from 'express';
import { body } from 'express-validator';
import {
  getTaskById,
  updateTask,
  updateTaskStatus,
  updateTaskAssignee,
  deleteTask,
} from '../control/task.controller.js';
import {
  getTaskComments,
  createComment,
} from '../control/comment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';

const router = express.Router();

router.use(authenticate);

// Task CRUD
router.get('/:id', getTaskById);

router.patch(
  '/:id',
  [
    body('version').isNumeric().withMessage('Task version is required for optimistic concurrency control'),
  ],
  validateRequest,
  updateTask
);

router.delete('/:id', deleteTask);

router.patch(
  '/:id/status',
  [
    body('status').isIn(['todo', 'in_progress', 'done']).withMessage('Status must be todo, in_progress, or done'),
    body('version').isNumeric().withMessage('Task version is required for optimistic concurrency control'),
  ],
  validateRequest,
  updateTaskStatus
);

router.patch(
  '/:id/assignee',
  [
    body('version').isNumeric().withMessage('Task version is required for optimistic concurrency control'),
  ],
  validateRequest,
  updateTaskAssignee
);

// Task comments
router.get('/:id/comments', getTaskComments);

router.post(
  '/:id/comments',
  [
    body('content').trim().notEmpty().withMessage('Comment content cannot be empty'),
  ],
  validateRequest,
  createComment
);

export default router;
