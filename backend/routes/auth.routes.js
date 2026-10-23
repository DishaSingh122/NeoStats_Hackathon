import express from 'express';
import { body } from 'express-validator';
import { login, logout, getMe } from '../control/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';

const router = express.Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email address is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  login
);

router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
