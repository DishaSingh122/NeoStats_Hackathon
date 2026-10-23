import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', (req, res) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  if (isMongoReady) {
    return res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    status: 'not_ready',
    database: 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

router.get('/test', (req, res) => {
  res.status(200).json({
    message: 'CollabFlow API is functional.',
    timestamp: new Date().toISOString(),
  });
});

export default router;
