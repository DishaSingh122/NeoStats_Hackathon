import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collab_project_manager';

let server;

const startServer = async () => {
  try {
    console.log('[CollabFlow Server] Initializing startup...');
    console.log(`[CollabFlow Server] Environment: ${process.env.NODE_ENV || 'development'}`);

    // Connect to MongoDB
    await connectDB(MONGODB_URI);

    server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  CollabFlow Backend API is running!`);
      console.log(`  Address: http://localhost:${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`  Ready Check:  http://localhost:${PORT}/api/ready`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('[CollabFlow Server] Fatal startup failure:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  console.log(`\n[CollabFlow Server] Received ${signal}. Commencing graceful shutdown...`);
  if (server) {
    server.close(() => {
      console.log('[CollabFlow Server] HTTP server closed.');
    });
  }
  await disconnectDB();
  process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startServer();
