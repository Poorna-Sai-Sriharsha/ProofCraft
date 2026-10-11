import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  ShoppingBag,
  MoreVertical,
  Archive,
  RotateCcw,
  Trash2,
  Edit2,
  Eye,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import { Purchase, WarrantyStatus } from '../types';
import { WarrantyBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') || 'purchaseDate';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const isArchived = searchParams.get('archived') === 'true';

  const [searchInput, setSearchInput] = useState(search);
  const [deleteModalPurchase, setDeleteModalPurchase] = useState<Purchase | null>(null);

  // Fetch purchases query
  const { data, isLoading, isError, error } = useQuery<{
    data: Purchase[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ['purchases', { page, search, category, status, sortBy, sortOrder, isArchived }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '10');
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      if (isArchived) params.set('onlyArchived', 'true');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await apiClient.get(`/purchases?${params.toString()}`);
      return { data: res.data.data, meta: res.data.meta };
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch(`/purchases/${id}/archive`);
    },
    onSuccess: () => {
      toast.success('Purchase moved to archive.');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to archive purchase.');
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch(`/purchases/${id}/restore`);
    },
    onSuccess: () => {
      toast.success('Purchase restored to active list.');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to restore purchase.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/purchases/${id}`);
    },
    onSuccess: () => {
      toast.success('Purchase deleted successfully.');
      setDeleteModalPurchase(null);
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-deadlines'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete purchase.');
    },
  });

  const [exporting, setExporting] = useState(false);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const res = await apiClient.get('/purchases/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'proofcart_inventory.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Inventory exported to CSV.');
    } catch (e: any) {
      toast.error('Failed to export inventory.');
    } finally {
      setExporting(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('search', searchInput.trim());
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const formatPrice = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasActiveFilters = Boolean(search || category || status);

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Purchase Inventory</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your registered products, warranties, and proof of purchase documents
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl shadow-sm transition-colors flex-shrink-0"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <Link
            to="/purchases/new"
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Purchase</span>
          </Link>
        </div>
      </div>

      {/* View Toggle Tabs (UX-09) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.delete('archived');
            next.set('page', '1');
            setSearchParams(next);
          }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            !isArchived
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active Purchases
        </button>
        <button
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.set('archived', 'true');
            next.set('page', '1');
            setSearchParams(next);
          }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
            isArchived
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Archived Purchases</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product name, brand, model, or retailer..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Appliances">Appliances</option>
            <option value="Audio">Audio</option>
            <option value="Mobile">Mobile</option>
            <option value="Accessories">Accessories</option>
            <option value="Furniture">Furniture</option>
            <option value="General">General</option>
          </select>

          {/* Warranty Status Filter */}
          <select
            value={status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="NONE">No Warranty</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          {/* Sort By */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('-');
              const newParams = new URLSearchParams(searchParams);
              newParams.set('sortBy', sb);
              newParams.set('sortOrder', so);
              setSearchParams(newParams);
            }}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="purchaseDate-desc">Newest Purchase</option>
            <option value="purchaseDate-asc">Oldest Purchase</option>
            <option value="purchasePrice-desc">Highest Price</option>
            <option value="purchasePrice-asc">Lowest Price</option>
            <option value="warrantyExpiryDate-asc">Nearest Expiry</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="p-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1"
              title="Clear all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          Loading purchases...
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">
          Failed to load purchases. {(error as any)?.message}
        </div>
      ) : !data?.data || data.data.length === 0 ? (
        <EmptyState
          icon={isArchived ? Archive : ShoppingBag}
          title={
            isArchived
              ? 'No archived purchases'
              : hasActiveFilters
              ? 'No matching purchases found'
              : 'No purchases in your vault yet'
          }
          description={
            isArchived
              ? 'Purchases you archive will be stored here safely. You can restore them back to your active inventory at any time.'
              : hasActiveFilters
              ? 'Try modifying your search query or removing the filters.'
              : 'Add your first product to start tracking warranty expiry, return windows, and receipts.'
          }
          actionText={
            isArchived
              ? 'View Active Purchases'
              : hasActiveFilters
              ? 'Clear Filters'
              : 'Add First Purchase'
          }
          actionHref={isArchived || hasActiveFilters ? undefined : '/purchases/new'}
          onAction={
            isArchived
              ? () => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('archived');
                  setSearchParams(next);
                }
              : hasActiveFilters
              ? clearFilters
              : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Purchase Date</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Warranty Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <Link
                        to={`/purchases/${purchase._id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 block transition-colors"
                      >
                        {purchase.productName}
                      </Link>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {purchase.brand ? `${purchase.brand} • ` : ''}
                        {purchase.retailer ? `Retailer: ${purchase.retailer}` : ''}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs font-medium text-slate-700">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg">
                        {purchase.category}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-600">
                      {format(parseISO(purchase.purchaseDate), 'MMM dd, yyyy')}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900">
                      {formatPrice(purchase.purchasePrice, purchase.currency)}
                    </td>

                    <td className="py-4 px-4">
                      <WarrantyBadge status={purchase.warrantyStatus} />
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <Link
                          to={`/purchases/${purchase._id}`}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/purchases/${purchase._id}/edit`}
                          title="Edit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        {purchase.archivedAt ? (
                          <button
                            onClick={() => restoreMutation.mutate(purchase._id)}
                            title="Restore to Active"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => archiveMutation.mutate(purchase._id)}
                            title="Archive"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteModalPurchase(purchase)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {data.meta.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing page <span className="font-bold text-slate-700">{data.meta.page}</span> of{' '}
                <span className="font-bold text-slate-700">{data.meta.totalPages}</span> ({data.meta.total} items)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={data.meta.page <= 1}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('page', (data.meta.page - 1).toString());
                    setSearchParams(newParams);
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={data.meta.page >= data.meta.totalPages}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('page', (data.meta.page + 1).toString());
                    setSearchParams(newParams);
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalPurchase && (
        <Modal
          isOpen={Boolean(deleteModalPurchase)}
          onClose={() => setDeleteModalPurchase(null)}
          title="Delete Purchase Record"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">{deleteModalPurchase.productName}</strong>?
              This will permanently remove the product and all associated documents and service histories.
            </p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setDeleteModalPurchase(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteModalPurchase._id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
