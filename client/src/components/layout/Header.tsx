import React from 'react';
import { Menu, Bell, Plus, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/dashboard')) return 'Overview';
    if (pathname === '/purchases') return 'My Purchases';
    if (pathname === '/purchases/new') return 'Add Purchase';
    if (pathname.includes('/edit')) return 'Edit Purchase';
    if (pathname.startsWith('/purchases/')) return 'Purchase Details';
    if (pathname.startsWith('/calendar')) return 'Warranty Calendar';
    if (pathname.startsWith('/service-history')) return 'Service History';
    if (pathname.startsWith('/notifications')) return 'Notifications';
    if (pathname.startsWith('/settings')) return 'Settings';
    return 'ProofCart';
  };

  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {getPageTitle(location.pathname)}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        <Link
          to="/notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadData?.unreadCount && unreadData.unreadCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white" />
          ) : null}
        </Link>

        <Link
          to="/purchases/new"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Purchase</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>
    </header>
  );
};
