import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wrench, Calendar, Trash2, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import { ServiceRecord } from '../types';
import { ClaimBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export default function ServiceHistoryPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{
    records: (ServiceRecord & { purchaseId: { _id: string; productName: string; brand?: string; category: string } })[];
    meta: { page: number; total: number };
  }>({
    queryKey: ['all-services'],
    queryFn: async () => {
      const res = await apiClient.get('/services?limit=50');
      return { records: res.data.data, meta: res.data.meta };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/services/${id}`);
    },
    onSuccess: () => {
      toast.success('Service record deleted.');
      queryClient.invalidateQueries({ queryKey: ['all-services'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete record.');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Global Service & Repair Logs</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          History of all maintenance events, repairs, and warranty claims across your purchases
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          Loading service history...
        </div>
      ) : !data?.records || data.records.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No service records logged yet"
          description="Service records and warranty repair claims can be added directly from any product's details page."
          actionText="View Purchases"
          actionHref="/purchases"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-4">Service Date</th>
                  <th className="py-3.5 px-4">Provider</th>
                  <th className="py-3.5 px-4">Issue & Resolution</th>
                  <th className="py-3.5 px-4">Claim Status</th>
                  <th className="py-3.5 px-4">Cost</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.records.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <Link
                        to={`/purchases/${record.purchaseId?._id || record.purchaseId}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 flex items-center space-x-1"
                      >
                        <span>{record.purchaseId?.productName || 'View Product'}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span className="text-xs text-slate-400">
                        {record.purchaseId?.brand || ''}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-600">
                      {format(parseISO(record.serviceDate), 'MMM dd, yyyy')}
                    </td>

                    <td className="py-4 px-4 text-xs font-semibold text-slate-800">
                      {record.serviceProvider}
                    </td>

                    <td className="py-4 px-4 text-xs max-w-xs">
                      <p className="font-medium text-slate-800">{record.issueDescription}</p>
                      {record.repairDescription && (
                        <p className="text-slate-500 italic mt-0.5">{record.repairDescription}</p>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <ClaimBadge status={record.warrantyClaimStatus} />
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900 text-xs">
                      ₹{record.repairCost || 0}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(record._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
