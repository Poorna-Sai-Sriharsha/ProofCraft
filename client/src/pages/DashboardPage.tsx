import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  IndianRupee,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  Eye,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { apiClient } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { DashboardSummary, Purchase } from '../types';
import { WarrantyBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export default function DashboardPage() {
  const { user } = useAuth();

  // 1. Summary Cards
  const {
    data: summary,
    isLoading: loadingSummary,
  } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/summary');
      return res.data.data;
    },
  });

  // 2. Spending Analytics
  const { data: spending, isLoading: loadingSpending } = useQuery<
    Array<{ category: string; amount: number; currency: string; count: number }>
  >({
    queryKey: ['dashboard-spending'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/spending');
      return res.data.data;
    },
  });

  // 3. Warranty Distribution
  const { data: warranties } = useQuery<
    Array<{ name: string; count: number; color: string }>
  >({
    queryKey: ['dashboard-warranties'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/warranties');
      return res.data.data;
    },
  });

  // 4. Upcoming Deadlines
  const { data: deadlines } = useQuery<
    Array<{
      purchaseId: string;
      productName: string;
      brand?: string;
      category: string;
      deadlineType: 'WARRANTY_EXPIRY' | 'RETURN_DEADLINE';
      deadlineDate: string;
      daysRemaining: number;
    }>
  >({
    queryKey: ['upcoming-deadlines'],
    queryFn: async () => {
      const res = await apiClient.get('/deadlines?days=90');
      return res.data.data;
    },
  });

  // 5. Recent Purchases
  const { data: recentPurchases, isLoading: loadingRecent } = useQuery<Purchase[]>({
    queryKey: ['recent-purchases'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/recent-purchases?limit=5');
      return res.data.data;
    },
  });

  const formatPrice = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {user?.name}! 👋
          </h2>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            {summary?.expiringSoon && summary.expiringSoon > 0
              ? `You have ${summary.expiringSoon} warranty expiring within the next 30 days.`
              : 'All your product warranties and receipts are up to date and secured.'}
          </p>
        </div>
        <Link
          to="/purchases/new"
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-sm rounded-xl shadow-sm transition-colors flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Purchase</span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Purchases */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Items</span>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-indigo-600 flex items-center justify-center border border-slate-100">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900">
              {loadingSummary ? '...' : summary?.totalPurchases || 0}
            </span>
            <p className="text-xs text-slate-500 mt-1">Active, non-archived items</p>
          </div>
          <Link
            to="/purchases"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-between"
          >
            <span>View all purchases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 2: Total Spending */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Spend</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            {loadingSummary ? (
              <span className="text-3xl font-extrabold text-slate-900">...</span>
            ) : summary?.totalSpentByCurrency && summary.totalSpentByCurrency.length > 0 ? (
              <div className="space-y-0.5">
                {summary.totalSpentByCurrency.map((curr) => (
                  <div key={curr.currency} className="text-2xl font-extrabold text-slate-900">
                    {formatPrice(curr.amount, curr.currency)}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-2xl font-extrabold text-slate-900">₹0</span>
            )}
            <p className="text-xs text-slate-500 mt-1">Calculated across active purchases</p>
          </div>
          <Link
            to="/purchases"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center justify-between"
          >
            <span>Track expenses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 3: Active Warranties */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Coverage</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900">
              {loadingSummary ? '...' : summary?.activeWarranties || 0}
            </span>
            <p className="text-xs text-slate-500 mt-1">Covered under active warranty</p>
          </div>
          <Link
            to="/calendar"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center justify-between"
          >
            <span>View warranty timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 4: Expiring Soon */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Expiring Soon</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-amber-600">
              {loadingSummary ? '...' : summary?.expiringSoon || 0}
            </span>
            <p className="text-xs text-slate-500 mt-1">Expiring in the next 30 days</p>
          </div>
          <Link
            to="/calendar"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center justify-between"
          >
            <span>Check upcoming deadlines</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Analytics & Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending By Category Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Expenditure by Category</h3>
              <p className="text-xs text-slate-400">Total spending grouped by purchase categories</p>
            </div>
          </div>

          {loadingSpending ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Loading analytics...
            </div>
          ) : !spending || spending.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <ShoppingBag className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm">No spending data available yet</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spending} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="categoryLabel" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => Number(val).toLocaleString()} />
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => [
                      formatPrice(Number(value), item.payload.currency),
                      'Total Spent',
                    ]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {spending.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Warranty Health Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Warranty Coverage Status</h3>
            <p className="text-xs text-slate-400 mb-6">Real-time status calculated against today's date</p>

            <div className="space-y-4">
              {warranties?.map((w) => (
                <div key={w.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: w.color }}
                    />
                    <span className="font-medium text-slate-700">{w.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-100">
                    {w.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <Link
              to="/calendar"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-between"
            >
              <span>Explore Warranty Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Deadlines & Recent Purchases Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Upcoming Deadlines</h3>
              <p className="text-xs text-slate-400">Nearest warranty and return deadlines</p>
            </div>
            <Link to="/calendar" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View All
            </Link>
          </div>

          {!deadlines || deadlines.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No deadlines within the next 90 days.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {deadlines.slice(0, 5).map((d) => (
                <div key={`${d.purchaseId}-${d.deadlineType}`} className="py-3 flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <Link
                      to={`/purchases/${d.purchaseId}`}
                      className="text-sm font-semibold text-slate-900 hover:text-indigo-600 truncate block"
                    >
                      {d.productName}
                    </Link>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-medium text-slate-500">
                        {d.deadlineType === 'WARRANTY_EXPIRY' ? 'Warranty Expiry' : 'Return Window'}
                      </span>
                      <span>•</span>
                      <span>{format(parseISO(d.deadlineDate), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        d.daysRemaining <= 7
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : d.daysRemaining <= 30
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {d.daysRemaining === 0 ? 'Expires Today' : `${d.daysRemaining} days left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchases */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Purchases</h3>
              <p className="text-xs text-slate-400">Latest active items added to vault</p>
            </div>
            <Link to="/purchases" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View All
            </Link>
          </div>

          {!recentPurchases || recentPurchases.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No purchases registered yet.</p>
              <Link to="/purchases/new" className="text-xs font-semibold text-indigo-600 hover:underline mt-1 inline-block">
                Add your first purchase
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPurchases.map((p) => (
                <div key={p._id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <Link
                      to={`/purchases/${p._id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-indigo-600 truncate block"
                    >
                      {p.productName}
                    </Link>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                      <span>{p.category}</span>
                      <span>•</span>
                      <span>{format(parseISO(p.purchaseDate), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className="text-sm font-bold text-slate-800">
                      {formatPrice(p.purchasePrice, p.currency)}
                    </span>
                    <WarrantyBadge status={p.warrantyStatus} />
                    <Link
                      to={`/purchases/${p._id}`}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
