import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env
dotenv.config();

const DEFAULT_SECRET = 'proofcart-super-secure-session-secret-change-in-prod-1234567890';

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/proofcart'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(16).default(DEFAULT_SECRET),
  STORAGE_PROVIDER: z.enum(['local', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
}).refine((data) => {
  if (data.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET || data.SESSION_SECRET === DEFAULT_SECRET) {
      return false;
    }
  }
  return true;
}, {
  message: 'In production mode, a custom non-default SESSION_SECRET of at least 16 characters is mandatory.',
  path: ['SESSION_SECRET'],
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
