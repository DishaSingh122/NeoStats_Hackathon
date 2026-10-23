import express from 'express';
import { deleteComment } from '../control/comment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.delete('/:id', deleteComment);

export default router;
