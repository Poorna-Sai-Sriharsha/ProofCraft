import { Request, Response } from 'express';
import { NotificationService } from './notification.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const notifications = await NotificationService.listNotifications(req.user!.id, limit, page);
  res.status(200).json({
    success: true,
    data: notifications,
  });
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await NotificationService.getUnreadCount(req.user!.id);
  res.status(200).json({
    success: true,
    data: { unreadCount: count },
  });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await NotificationService.markAsRead(req.user!.id, req.params.id);
  res.status(200).json({
    success: true,
    data: notification,
  });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationService.markAllAsRead(req.user!.id);
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationService.deleteNotification(req.user!.id, req.params.id);
  res.status(200).json({
    success: true,
    data: result,
  });
});
