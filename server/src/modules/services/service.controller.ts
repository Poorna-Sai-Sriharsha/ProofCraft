import { Request, Response } from 'express';
import { ServiceRecordService } from './service.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const createServiceRecord = asyncHandler(async (req: Request, res: Response) => {
  const record = await ServiceRecordService.createServiceRecord(
    req.user!.id,
    req.params.id,
    req.body
  );
  res.status(201).json({
    success: true,
    data: record,
  });
});

export const getPurchaseServiceRecords = asyncHandler(async (req: Request, res: Response) => {
  const records = await ServiceRecordService.getServiceRecordsByPurchase(
    req.user!.id,
    req.params.id
  );
  res.status(200).json({
    success: true,
    data: records,
  });
});

export const getAllServiceRecords = asyncHandler(async (req: Request, res: Response) => {
  const result = await ServiceRecordService.getAllServiceRecords(
    req.user!.id,
    req.query as any
  );
  res.status(200).json({
    success: true,
    data: result.records,
    meta: result.meta,
  });
});

export const getServiceRecordById = asyncHandler(async (req: Request, res: Response) => {
  const record = await ServiceRecordService.getServiceRecordById(
    req.user!.id,
    req.params.id
  );
  res.status(200).json({
    success: true,
    data: record,
  });
});

export const updateServiceRecord = asyncHandler(async (req: Request, res: Response) => {
  const record = await ServiceRecordService.updateServiceRecord(
    req.user!.id,
    req.params.id,
    req.body
  );
  res.status(200).json({
    success: true,
    data: record,
  });
});

export const deleteServiceRecord = asyncHandler(async (req: Request, res: Response) => {
  const result = await ServiceRecordService.deleteServiceRecord(
    req.user!.id,
    req.params.id
  );
  res.status(200).json({
    success: true,
    data: result,
  });
});
