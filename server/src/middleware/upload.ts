import multer from 'multer';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      ApiError.badRequest(
        `Unsupported file type '${file.mimetype}'. Allowed formats: PDF, JPEG, PNG, WEBP.`,
        'UNSUPPORTED_MEDIA_TYPE'
      )
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // 5MB default
  },
  fileFilter,
});
