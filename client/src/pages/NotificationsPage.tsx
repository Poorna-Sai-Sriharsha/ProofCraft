import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, ShieldCheck, RotateCcw, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import { NotificationItem } from '../types';
import { EmptyState } from '../components/ui/EmptyState';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      return res.data.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      toast.success('All notifications marked as read.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      toast.success('Notification removed.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const hasUnread = notifications?.some((n) => !n.readAt);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Notification Center</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated alerts for upcoming warranty expirations and return deadlines
          </p>
        </div>

        {hasUnread && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center space-x-1.5 self-start sm:self-center"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          Loading notifications...
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications at this time"
          description="ProofCart will automatically generate reminders at 30 days, 7 days, and 1 day before any warranty or return deadline expires."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item._id}
              className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                !item.readAt
                  ? 'bg-indigo-50/40 border-indigo-200 shadow-sm'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.type === 'WARRANTY_EXPIRY'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {item.type === 'WARRANTY_EXPIRY' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <RotateCcw className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const targetPurchaseId = typeof item.purchaseId === 'object' && item.purchaseId ? (item.purchaseId as any)._id : item.purchaseId;
                      return targetPurchaseId ? (
                        <Link
                          to={`/purchases/${targetPurchaseId}`}
                          className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      );
                    })()}
                    {!item.readAt && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-[11px] text-slate-400">
                      {format(parseISO(item.createdAt), 'MMMM dd, yyyy • h:mm a')}
                    </span>
                    {(() => {
                      const targetPurchaseId = typeof item.purchaseId === 'object' && item.purchaseId ? (item.purchaseId as any)._id : item.purchaseId;
                      return targetPurchaseId ? (
                        <Link
                          to={`/purchases/${targetPurchaseId}`}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center space-x-0.5"
                        >
                          <span>View Product</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {!item.readAt && (
                  <button
                    onClick={() => markReadMutation.mutate(item._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                    title="Mark as Read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(item._id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
