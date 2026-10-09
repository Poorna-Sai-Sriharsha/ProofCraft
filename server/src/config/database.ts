import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;
let memoryServer: any = null;

export const connectDatabase = async (): Promise<typeof mongoose> => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    mongoose.set('strictQuery', true);

    // Try connecting to the provided MONGODB_URI
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });

    isConnected = true;
    logger.info(`✅ Connected to MongoDB at: ${env.MONGODB_URI}`);
    return mongoose;
  } catch (error: any) {
    logger.warn(`⚠️ Failed to connect to ${env.MONGODB_URI} (${error.message}).`);

    // In development or test, fallback to MongoMemoryServer so the app runs without external setup
    if (env.NODE_ENV !== 'production') {
      try {
        logger.info('🚀 Launching in-memory MongoDB fallback for local development/testing...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memoryUri = memoryServer.getUri();

        await mongoose.connect(memoryUri);
        isConnected = true;
        logger.info(`✅ Connected to In-Memory MongoDB at: ${memoryUri}`);
        return mongoose;
      } catch (memErr: any) {
        logger.error(`❌ In-Memory MongoDB failed: ${memErr.message}`);
        throw memErr;
      }
    }

    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  logger.info('🔌 Disconnected from MongoDB');
};

export const isDatabaseHealthy = (): boolean => {
  return mongoose.connection.readyState === 1;
};
