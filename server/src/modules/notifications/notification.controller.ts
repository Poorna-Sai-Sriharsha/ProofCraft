import { Request, Response } from 'express';
import { NotificationService } from './notification.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await NotificationService.listNotifications(req.user!.id);
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
