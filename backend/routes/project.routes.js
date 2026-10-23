import express from 'express';
import { body } from 'express-validator';
import {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  archiveProject,
} from '../control/project.controller.js';
import {
  getProjectMembers,
  addProjectMember,
  updateMemberRole,
  removeProjectMember,
} from '../control/projectMember.controller.js';
import {
  getProjectTasks,
  createTask,
} from '../control/task.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles, requireProjectAccess } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';

const router = express.Router();

router.use(authenticate);

// Projects listing and creation
router.get('/', getProjects);

router.post(
  '/',
  requireRoles('admin', 'project_manager'),
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Project name must be 2-100 characters'),
  ],
  validateRequest,
  createProject
);

router.get('/:id', requireProjectAccess('viewer'), getProjectById);

router.patch(
  '/:id',
  requireProjectAccess('manager'),
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Project name must be 2-100 characters'),
  ],
  validateRequest,
  updateProject
);

router.patch('/:id/archive', requireProjectAccess('manager'), archiveProject);

// Project Membership routes
router.get('/:id/team', requireProjectAccess('viewer'), getProjectMembers);

router.post(
  '/:id/team',
  requireProjectAccess('manager'),
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('role').optional().isIn(['manager', 'member', 'viewer']).withMessage('Invalid project role'),
  ],
  validateRequest,
  addProjectMember
);

router.patch(
  '/:id/team/:userId',
  requireProjectAccess('manager'),
  [
    body('role').isIn(['manager', 'member', 'viewer']).withMessage('Valid project role is required'),
  ],
  validateRequest,
  updateMemberRole
);

router.delete('/:id/team/:userId', requireProjectAccess('manager'), removeProjectMember);

// Project Tasks routes
router.get('/:id/tasks', requireProjectAccess('viewer'), getProjectTasks);

router.post(
  '/:id/tasks',
  requireProjectAccess('member'),
  [
    body('title').trim().isLength({ min: 2, max: 150 }).withMessage('Title must be 2-150 characters'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
    body('status').optional().isIn(['todo', 'in_progress', 'done']).withMessage('Invalid status'),
  ],
  validateRequest,
  createTask
);

export default router;
