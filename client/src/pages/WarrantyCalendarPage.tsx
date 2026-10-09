import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ShieldCheck,
  RotateCcw,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { apiClient } from '../lib/api';

export default function WarrantyCalendarPage() {
  const [filterDays, setFilterDays] = useState<number>(90);

  const { data: deadlines, isLoading } = useQuery<
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
    queryKey: ['calendar-deadlines', filterDays],
    queryFn: async () => {
      const res = await apiClient.get(`/deadlines?days=${filterDays}`);
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Warranty & Return Calendar</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor upcoming manufacturer warranty expirations and retailer return deadlines
          </p>
        </div>

        <div className="flex items-center space-x-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold">
          {[
            { label: '7 Days', days: 7 },
            { label: '30 Days', days: 30 },
            { label: '90 Days', days: 90 },
            { label: 'All (1 Year)', days: 365 },
          ].map((tab) => (
            <button
              key={tab.days}
              onClick={() => setFilterDays(tab.days)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterDays === tab.days
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          Scanning calendar deadlines...
        </div>
      ) : !deadlines || deadlines.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No deadlines in this timeframe</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            None of your registered purchases have warranties or return periods ending in the next {filterDays} days.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deadlines.map((item) => (
            <div
              key={`${item.purchaseId}-${item.deadlineType}`}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start space-x-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.deadlineType === 'WARRANTY_EXPIRY'
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}
                >
                  {item.deadlineType === 'WARRANTY_EXPIRY' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <RotateCcw className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/purchases/${item.purchaseId}`}
                      className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      {item.productName}
                    </Link>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {item.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.brand ? `${item.brand} • ` : ''}
                    {item.deadlineType === 'WARRANTY_EXPIRY' ? 'Manufacturer Warranty Expiry' : 'Return Window Closes'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-400 block">Target Date</span>
                  <span className="text-sm font-bold text-slate-800">
                    {format(parseISO(item.deadlineDate), 'MMMM dd, yyyy')}
                  </span>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-xl text-xs font-bold ${
                      item.daysRemaining <= 7
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : item.daysRemaining <= 30
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {item.daysRemaining === 0 ? 'Expires Today' : `${item.daysRemaining} days remaining`}
                  </span>
                </div>

                <Link
                  to={`/purchases/${item.purchaseId}`}
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
