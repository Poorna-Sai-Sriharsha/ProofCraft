import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ShoppingBag,
  IndianRupee,
  Calendar,
  ShieldCheck,
  FileText,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

const addPurchaseSchema = z.object({
  productName: z.string().min(1, 'Product name is required').max(200).trim(),
  brand: z.string().max(100).trim().optional(),
  category: z.string().min(1, 'Category is required').default('Electronics'),
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
  warrantyStartDate: z.string().optional(),
  warrantyDurationMonths: z.coerce.number().min(0).optional(),
  warrantyExpiryDate: z.string().optional(),
  warrantyProvider: z.string().max(150).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

type AddPurchaseFormData = z.infer<typeof addPurchaseSchema>;

export default function AddPurchasePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AddPurchaseFormData>({
    resolver: zodResolver(addPurchaseSchema),
    defaultValues: {
      category: 'Electronics',
      currency: 'INR',
      purchaseDate: new Date().toISOString().split('T')[0],
      warrantyStatus: 'ACTIVE',
      warrantyDurationMonths: 12,
      returnWindowDays: 14,
    },
  });

  const warrantyStatus = watch('warrantyStatus');
  const showWarrantyFields = warrantyStatus === 'ACTIVE' || warrantyStatus === 'EXPIRED';

  const mutation = useMutation({
    mutationFn: async (data: AddPurchaseFormData) => {
      // 1. Create Purchase
      const res = await apiClient.post('/purchases', data);
      const purchase = res.data.data;

      // 2. If user selected an invoice file, upload it immediately
      if (selectedInvoice && purchase.id) {
        const formData = new FormData();
        formData.append('file', selectedInvoice);
        formData.append('documentType', 'INVOICE');
        await apiClient.post(`/purchases/${purchase.id}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return purchase;
    },
    onSuccess: (purchase) => {
      toast.success('Product registered in vault successfully!');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-deadlines'] });
      navigate(`/purchases/${purchase.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create purchase.');
    },
  });

  const onSubmit = (data: AddPurchaseFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button and page header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Register New Purchase</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Add product credentials, invoice, and warranty duration to your vault
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Product Information */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm uppercase tracking-wider pb-3 border-b border-slate-100">
            <ShoppingBag className="w-4 h-4" />
            <span>Product Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('productName')}
                placeholder="e.g. Dell XPS 15 9530 Laptop"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              {errors.productName && (
                <p className="text-xs text-red-500 mt-1">{errors.productName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand / Manufacturer</label>
              <input
                type="text"
                {...register('brand')}
                placeholder="e.g. Dell, Apple, Sony, Samsung"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                {...register('category')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Model Number</label>
              <input
                type="text"
                {...register('modelNumber')}
                placeholder="e.g. XPS9530-7452SLV"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number</label>
              <input
                type="text"
                {...register('serialNumber')}
                placeholder="e.g. SN-894729184"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Purchase & Retail Details */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm uppercase tracking-wider pb-3 border-b border-slate-100">
            <Calendar className="w-4 h-4" />
            <span>Purchase & Financial Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                {...register('purchasePrice')}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              {errors.purchasePrice && (
                <p className="text-xs text-red-500 mt-1">{errors.purchasePrice.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
              <select
                {...register('currency')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('purchaseDate')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              {errors.purchaseDate && (
                <p className="text-xs text-red-500 mt-1">{errors.purchaseDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Retailer / Store</label>
              <input
                type="text"
                {...register('retailer')}
                placeholder="e.g. Amazon, Croma, Official Store"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Order / Invoice ID</label>
              <input
                type="text"
                {...register('orderId')}
                placeholder="e.g. ORD-981249"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return Window (Days)</label>
              <input
                type="number"
                {...register('returnWindowDays')}
                placeholder="e.g. 14"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Warranty Coverage */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm uppercase tracking-wider pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4" />
            <span>Warranty Coverage & Lifecycle</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty Status</label>
              <select
                {...register('warrantyStatus')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="ACTIVE">Active</option>
                <option value="NONE">No Warranty</option>
                <option value="EXPIRED">Expired</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>

            {showWarrantyFields && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Coverage Duration (Months)
                  </label>
                  <input
                    type="number"
                    {...register('warrantyDurationMonths')}
                    placeholder="e.g. 12 or 24"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty Provider</label>
                  <input
                    type="text"
                    {...register('warrantyProvider')}
                    placeholder="e.g. Dell Premium Care, AppleCare"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Explicit Expiry Date (Overrides calculation)
                  </label>
                  <input
                    type="date"
                    {...register('warrantyExpiryDate')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 4: Document Attachment & Notes */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm uppercase tracking-wider pb-3 border-b border-slate-100">
            <FileText className="w-4 h-4" />
            <span>Document Attachment & Notes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Upload Purchase Invoice (PDF, PNG, JPG - Max 5MB)
              </label>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedInvoice(e.target.files[0]);
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {selectedInvoice && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Selected: {selectedInvoice.name}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Notes</label>
              <textarea
                rows={2}
                {...register('notes')}
                placeholder="Serial number location, warranty claim instructions, etc."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center space-x-2 disabled:opacity-70"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering Product...</span>
              </>
            ) : (
              <span>Save & Register Product</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
