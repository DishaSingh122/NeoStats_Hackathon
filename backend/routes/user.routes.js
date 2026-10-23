import express from 'express';
import { body } from 'express-validator';
import {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  updateUserStatus,
} from '../control/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';

const router = express.Router();

router.use(authenticate);

// Admin-only endpoints
router.get('/', requireRoles('admin'), getUsers);
router.post(
  '/',
  requireRoles('admin'),
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'project_manager', 'team_member', 'viewer']).withMessage('Invalid role'),
  ],
  validateRequest,
  createUser
);

router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.patch('/:id/status', requireRoles('admin'), updateUserStatus);

export default router;
