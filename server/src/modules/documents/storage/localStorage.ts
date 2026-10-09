import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { IStorageProvider, StorageResult } from './storage.interface.js';
import { env } from '../../../config/env.js';

export class LocalStorageProvider implements IStorageProvider {
  public readonly name = 'local';
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'documents');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<StorageResult> {
    const fileExtension = path.extname(file.originalname);
    const uniqueKey = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    const destinationPath = path.join(this.uploadDir, uniqueKey);

    if (file.buffer) {
      await fs.promises.writeFile(destinationPath, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, destinationPath);
    } else {
      throw new Error('Multer file content buffer or path not found');
    }

    return {
      storageKey: uniqueKey,
      storageProvider: this.name,
    };
  }

  async getFileStream(storageKey: string): Promise<Readable> {
    const safeKey = path.basename(storageKey);
    const filePath = path.join(this.uploadDir, safeKey);

    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in storage');
    }

    return fs.createReadStream(filePath);
  }

  async deleteFile(storageKey: string): Promise<void> {
    const safeKey = path.basename(storageKey);
    const filePath = path.join(this.uploadDir, safeKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}
