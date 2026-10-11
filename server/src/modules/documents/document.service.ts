import mongoose from 'mongoose';
import { PurchaseDocument, DocumentType } from './document.model.js';
import { Purchase } from '../purchases/purchase.model.js';
import { getStorageProvider } from './storage/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';

export class DocumentService {
  static async uploadDocument(
    userId: string,
    purchaseId: string,
    file: Express.Multer.File,
    documentType: DocumentType = 'INVOICE'
  ) {
    if (!file) {
      throw ApiError.badRequest('No file provided for upload', 'NO_FILE_PROVIDED');
    }

    if (!DocumentService.isValidFileSignature(file.buffer, file.mimetype)) {
      throw ApiError.badRequest(
        `File content signature does not match declared type '${file.mimetype}'.`,
        'INVALID_FILE_SIGNATURE'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      throw ApiError.badRequest('Invalid purchase identifier', 'INVALID_PURCHASE_ID');
    }

    // 1. Authoritative ownership verification
    const purchase = await Purchase.findOne({
      _id: new mongoose.Types.ObjectId(purchaseId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!purchase) {
      throw ApiError.notFound('Purchase record not found', 'PURCHASE_NOT_FOUND');
    }

    const storage = getStorageProvider();

    // 2. Save file to storage
    const storageResult = await storage.saveFile(file);

    try {
      // 3. Persist document metadata
      const document = await PurchaseDocument.create({
        userId: new mongoose.Types.ObjectId(userId),
        purchaseId: new mongoose.Types.ObjectId(purchaseId),
        documentType,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageProvider: storageResult.storageProvider,
        storageKey: storageResult.storageKey,
      });

      return document;
    } catch (error: any) {
      // 4. Cleanup stored file if database insertion fails
      logger.error(`Database failure after upload, attempting storage cleanup for: ${storageResult.storageKey}`);
      try {
        await storage.deleteFile(storageResult.storageKey);
      } catch (cleanupErr: any) {
        logger.error(`Failed to cleanup orphaned storage file: ${cleanupErr.message}`);
      }
      throw error;
    }
  }

  static async getDocumentsByPurchase(userId: string, purchaseId: string) {
    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      throw ApiError.badRequest('Invalid purchase identifier', 'INVALID_PURCHASE_ID');
    }

    // Verify purchase ownership
    const purchase = await Purchase.findOne({
      _id: new mongoose.Types.ObjectId(purchaseId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!purchase) {
      throw ApiError.notFound('Purchase record not found', 'PURCHASE_NOT_FOUND');
    }

    return PurchaseDocument.find({
      purchaseId: new mongoose.Types.ObjectId(purchaseId),
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });
  }

  static async getDocumentForDownload(userId: string, documentId: string) {
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw ApiError.badRequest('Invalid document identifier', 'INVALID_DOCUMENT_ID');
    }

    const document = await PurchaseDocument.findOne({
      _id: new mongoose.Types.ObjectId(documentId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!document) {
      throw ApiError.notFound('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    const storage = getStorageProvider();
    const stream = await storage.getFileStream(document.storageKey);

    return {
      stream,
      mimeType: document.mimeType,
      originalFilename: document.originalFilename,
      sizeBytes: document.sizeBytes,
    };
  }

  static async deleteDocument(userId: string, documentId: string) {
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw ApiError.badRequest('Invalid document identifier', 'INVALID_DOCUMENT_ID');
    }

    const document = await PurchaseDocument.findOne({
      _id: new mongoose.Types.ObjectId(documentId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!document) {
      throw ApiError.notFound('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    const storage = getStorageProvider();

    // 1. Delete physical storage file
    try {
      await storage.deleteFile(document.storageKey);
    } catch (err: any) {
      logger.warn(`Could not delete physical file ${document.storageKey}: ${err.message}`);
    }

    // 2. Delete database record
    await PurchaseDocument.deleteOne({ _id: document._id });

    return { message: 'Document removed successfully.' };
  }

  static isValidFileSignature(buffer: Buffer, mimeType: string): boolean {
    if (!buffer || buffer.length < 4) return false;

    switch (mimeType) {
      case 'application/pdf':
        // PDF begins with '%PDF' (0x25, 0x50, 0x44, 0x46)
        return buffer.subarray(0, 4).toString('ascii') === '%PDF';

      case 'image/jpeg':
        // JPEG starts with 0xFF 0xD8 0xFF
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

      case 'image/png':
        // PNG starts with 0x89 0x50 0x4E 0x47 (89 50 4E 47 0D 0A 1A 0A)
        return (
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47
        );

      case 'image/webp':
        // WEBP starts with 'RIFF' and bytes 8-11 are 'WEBP'
        if (buffer.length < 12) return false;
        return (
          buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
          buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        );

      default:
        return false;
    }
  }
}
