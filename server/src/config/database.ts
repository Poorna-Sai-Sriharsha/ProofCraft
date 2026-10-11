import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;
let memoryServer: any = null;

const registerLifecycleListeners = () => {
  if (mongoose.connection.listenerCount('disconnected') === 0) {
    mongoose.connection.on('disconnected', () => {
      if (isConnected) {
        logger.warn('⚠️ MongoDB connection lost. Attempting auto-reconnect...');
        isConnected = false;
      }
    });
    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected successfully.');
      isConnected = true;
    });
    mongoose.connection.on('error', (err) => {
      if (isConnected) {
        logger.error(`❌ MongoDB runtime error: ${err.message}`);
      }
    });
  }
};

export const connectDatabase = async (): Promise<typeof mongoose> => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  mongoose.set('strictQuery', true);

  try {
    // Try connecting to the provided MONGODB_URI
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });

    isConnected = true;
    registerLifecycleListeners();
    logger.info(`✅ Connected to MongoDB at: ${env.MONGODB_URI}`);
    return mongoose;
  } catch (error: any) {
    // In development or test, fallback to MongoMemoryServer so the app runs without external setup
    if (env.NODE_ENV !== 'production') {
      try {
        logger.info(`ℹ️ Local MongoDB service not detected (${error.message}).`);
        logger.info('🚀 Launching built-in in-memory MongoDB fallback for seamless local development...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memoryUri = memoryServer.getUri();

        await mongoose.connect(memoryUri);
        isConnected = true;
        registerLifecycleListeners();
        logger.info(`✅ Connected to In-Memory MongoDB at: ${memoryUri}`);
        return mongoose;
      } catch (memErr: any) {
        logger.error(`❌ In-Memory MongoDB failed: ${memErr.message}`);
        throw memErr;
      }
    }

    logger.error(`❌ Fatal: Failed to connect to MongoDB at ${env.MONGODB_URI} (${error.message})`);
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
