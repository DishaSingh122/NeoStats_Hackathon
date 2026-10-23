import mongoose from 'mongoose';

export const connectDB = async (uri) => {
  const mongoURI = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collab_project_manager';
  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error(`[MongoDB] Disconnection error: ${error.message}`);
  }
};
