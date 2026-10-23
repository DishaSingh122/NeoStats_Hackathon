import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import commentRoutes from './routes/comment.routes.js';
import healthRoutes from './routes/health.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Local dev flexibility
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration with credentials support
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, supertest)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Dev mode permissive for localhost ports
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Request body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Request logger in development
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health routes mounted directly under /api
app.use('/api', healthRoutes);

// Feature routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

export default app;
