import { Request, Response } from 'express';
import { DocumentService } from './document.service.js';
import { DocumentType } from './document.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const documentType = (req.body.documentType as DocumentType) || 'INVOICE';
  const document = await DocumentService.uploadDocument(
    req.user!.id,
    req.params.id,
    req.file!,
    documentType
  );

  res.status(201).json({
    success: true,
    data: document,
  });
});

export const getDocuments = asyncHandler(async (req: Request, res: Response) => {
  const documents = await DocumentService.getDocumentsByPurchase(req.user!.id, req.params.id);
  res.status(200).json({
    success: true,
    data: documents,
  });
});

export const downloadDocument = asyncHandler(async (req: Request, res: Response) => {
  const { stream, mimeType, originalFilename } = await DocumentService.getDocumentForDownload(
    req.user!.id,
    req.params.id
  );

  res.setHeader('Content-Type', mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(originalFilename)}"`
  );

  stream.pipe(res);
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const result = await DocumentService.deleteDocument(req.user!.id, req.params.id);
  res.status(200).json({
    success: true,
    data: result,
  });
});
