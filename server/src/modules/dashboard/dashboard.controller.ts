import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await DashboardService.getSummary(req.user!.id);
  res.status(200).json({
    success: true,
    data: summary,
  });
});

export const getSpending = asyncHandler(async (req: Request, res: Response) => {
  const spending = await DashboardService.getSpendingAnalytics(req.user!.id);
  res.status(200).json({
    success: true,
    data: spending,
  });
});

export const getWarranties = asyncHandler(async (req: Request, res: Response) => {
  const warranties = await DashboardService.getWarrantyDistribution(req.user!.id);
  res.status(200).json({
    success: true,
    data: warranties,
  });
});

export const getRecentPurchases = asyncHandler(async (req: Request, res: Response) => {
  const parsedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
  const limit = isNaN(parsedLimit) ? 5 : Math.min(Math.max(1, parsedLimit), 50);
  const purchases = await DashboardService.getRecentPurchases(req.user!.id, limit);
  res.status(200).json({
    success: true,
    data: purchases,
  });
});

export const getDeadlines = asyncHandler(async (req: Request, res: Response) => {
  const parsedDays = req.query.days ? parseInt(req.query.days as string, 10) : 90;
  const days = isNaN(parsedDays) ? 90 : Math.min(Math.max(1, parsedDays), 365);
  const deadlines = await DashboardService.getUpcomingDeadlines(req.user!.id, days);
  res.status(200).json({
    success: true,
    data: deadlines,
  });
});
