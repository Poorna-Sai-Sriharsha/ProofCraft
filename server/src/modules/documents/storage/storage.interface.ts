import { Readable } from 'stream';

export interface StorageResult {
  storageKey: string;
  storageProvider: string;
}

export interface IStorageProvider {
  name: string;
  saveFile(file: Express.Multer.File): Promise<StorageResult>;
  getFileStream(storageKey: string): Promise<Readable>;
  deleteFile(storageKey: string): Promise<void>;
}
