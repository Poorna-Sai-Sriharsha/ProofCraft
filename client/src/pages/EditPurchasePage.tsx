import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { Purchase } from '../types';

const editPurchaseSchema = z.object({
  productName: z.string().min(1, 'Product name is required').max(200).trim(),
  brand: z.string().max(100).trim().optional(),
  category: z.string().min(1).default('Electronics'),
  modelNumber: z.string().max(100).trim().optional(),
  serialNumber: z.string().max(100).trim().optional(),
  purchasePrice: z.coerce.number().min(0, 'Price must be positive or zero'),
  currency: z.string().default('INR'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  retailer: z.string().max(150).trim().optional(),
  orderId: z.string().max(100).trim().optional(),
  returnWindowDays: z.coerce.number().min(0).optional(),
  returnDeadline: z.string().optional(),
  warrantyStatus: z.enum(['ACTIVE', 'EXPIRED', 'NONE', 'UNKNOWN']).default('ACTIVE'),
  warrantyDurationMonths: z.coerce.number().min(0).optional(),
  warrantyExpiryDate: z.string().optional(),
  warrantyProvider: z.string().max(150).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

type EditPurchaseFormData = z.infer<typeof editPurchaseSchema>;

export default function EditPurchasePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: purchase, isLoading } = useQuery<Purchase>({
    queryKey: ['purchase', id],
    queryFn: async () => {
      const res = await apiClient.get(`/purchases/${id}`);
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditPurchaseFormData>({
    resolver: zodResolver(editPurchaseSchema),
  });

  useEffect(() => {
    if (purchase) {
      reset({
        productName: purchase.productName,
        brand: purchase.brand || '',
        category: purchase.category,
        modelNumber: purchase.modelNumber || '',
        serialNumber: purchase.serialNumber || '',
        purchasePrice: purchase.purchasePrice,
        currency: purchase.currency || 'INR',
        purchaseDate: purchase.purchaseDate.split('T')[0],
        retailer: purchase.retailer || '',
        orderId: purchase.orderId || '',
        returnWindowDays: purchase.returnWindowDays || 0,
        returnDeadline: purchase.returnDeadline ? purchase.returnDeadline.split('T')[0] : '',
        warrantyStatus: purchase.warrantyStatus,
        warrantyDurationMonths: purchase.warrantyDurationMonths || 0,
        warrantyExpiryDate: purchase.warrantyExpiryDate ? purchase.warrantyExpiryDate.split('T')[0] : '',
        warrantyProvider: purchase.warrantyProvider || '',
        notes: purchase.notes || '',
      });
    }
  }, [purchase, reset]);

  const mutation = useMutation({
    mutationFn: async (data: EditPurchaseFormData) => {
      const res = await apiClient.patch(`/purchases/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Purchase updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['purchase', id] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-deadlines'] });
      navigate(`/purchases/${id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update purchase.');
    },
  });

  const onSubmit = (data: EditPurchaseFormData) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
        Loading purchase data for editing...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Edit Purchase Details</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Update specifications, warranty conditions, or notes
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name</label>
              <input
                type="text"
                {...register('productName')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {errors.productName && (
                <p className="text-xs text-red-500 mt-1">{errors.productName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
              <input
                type="text"
                {...register('brand')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                {...register('category')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Electronics">Electronics</option>
                <option value="Appliances">Appliances</option>
                <option value="Audio">Audio</option>
                <option value="Mobile">Mobile</option>
                <option value="Accessories">Accessories</option>
                <option value="Furniture">Furniture</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Price</label>
              <input
                type="number"
                step="any"
                {...register('purchasePrice')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                {...register('purchaseDate')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty Status</label>
              <select
                {...register('warrantyStatus')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="NONE">No Warranty</option>
                <option value="EXPIRED">Expired</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty Duration (Months)</label>
              <input
                type="number"
                {...register('warrantyDurationMonths')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={3}
              {...register('notes')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm flex items-center space-x-2 disabled:opacity-70"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
