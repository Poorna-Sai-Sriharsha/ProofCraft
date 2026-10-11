import { Request, Response } from 'express';
import { PurchaseService } from './purchase.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const createPurchase = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await PurchaseService.createPurchase(req.user!.id, req.body);
  res.status(201).json({
    success: true,
    data: purchase,
  });
});

export const getPurchases = asyncHandler(async (req: Request, res: Response) => {
  const result = await PurchaseService.getPurchases(req.user!.id, req.query as any);
  res.status(200).json({
    success: true,
    data: result.purchases,
    meta: result.meta,
  });
});

export const getPurchaseById = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await PurchaseService.getPurchaseById(req.user!.id, req.params.id);
  res.status(200).json({
    success: true,
    data: purchase,
  });
});

export const updatePurchase = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await PurchaseService.updatePurchase(req.user!.id, req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: purchase,
  });
});

export const archivePurchase = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await PurchaseService.archivePurchase(req.user!.id, req.params.id);
  res.status(200).json({
    success: true,
    data: purchase,
  });
});

export const restorePurchase = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await PurchaseService.restorePurchase(req.user!.id, req.params.id);
  res.status(200).json({
    success: true,
    data: purchase,
  });
});

export const deletePurchase = asyncHandler(async (req: Request, res: Response) => {
  const result = await PurchaseService.deletePurchase(req.user!.id, req.params.id);
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const exportPurchases = asyncHandler(async (req: Request, res: Response) => {
  const csv = await PurchaseService.exportPurchasesCsv(req.user!.id);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="proofcart_inventory.csv"');
  res.status(200).send(csv);
});
