import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  IndianRupee,
  ShieldCheck,
  FileText,
  Wrench,
  Download,
  Trash2,
  Edit2,
  Plus,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle,
  Archive,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import { Purchase, PurchaseDocument, ServiceRecord } from '../types';
import { WarrantyBadge, ClaimBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export default function PurchaseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Document upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('INVOICE');

  // Service record modal state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceProvider, setServiceProvider] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [repairDescription, setRepairDescription] = useState('');
  const [repairCost, setRepairCost] = useState('0');
  const [warrantyClaimStatus, setWarrantyClaimStatus] = useState('NOT_APPLICABLE');

  const openCreateServiceModal = () => {
    setEditingServiceId(null);
    setServiceDate(new Date().toISOString().split('T')[0]);
    setServiceProvider('');
    setIssueDescription('');
    setRepairDescription('');
    setRepairCost('0');
    setWarrantyClaimStatus('NOT_APPLICABLE');
    setServiceModalOpen(true);
  };

  const openEditServiceModal = (sr: ServiceRecord) => {
    setEditingServiceId(sr._id);
    setServiceDate(sr.serviceDate ? new Date(sr.serviceDate).toISOString().split('T')[0] : '');
    setServiceProvider(sr.serviceProvider);
    setIssueDescription(sr.issueDescription);
    setRepairDescription(sr.repairDescription || '');
    setRepairCost(String(sr.repairCost || 0));
    setWarrantyClaimStatus(sr.warrantyClaimStatus || 'NOT_APPLICABLE');
    setServiceModalOpen(true);
  };

  // 1. Fetch Purchase Details
  const {
    data: purchase,
    isLoading,
    isError,
  } = useQuery<Purchase>({
    queryKey: ['purchase', id],
    queryFn: async () => {
      const res = await apiClient.get(`/purchases/${id}`);
      return res.data.data;
    },
  });

  // 2. Fetch Attached Documents
  const { data: documents } = useQuery<PurchaseDocument[]>({
    queryKey: ['purchase-documents', id],
    queryFn: async () => {
      const res = await apiClient.get(`/purchases/${id}/documents`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  // 3. Fetch Service Records for this purchase
  const { data: serviceRecords } = useQuery<ServiceRecord[]>({
    queryKey: ['purchase-services', id],
    queryFn: async () => {
      const res = await apiClient.get(`/purchases/${id}/services`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  // Upload Document Mutation
  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDocFile) throw new Error('No file chosen');
      const formData = new FormData();
      formData.append('file', selectedDocFile);
      formData.append('documentType', docType);
      return apiClient.post(`/purchases/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Document uploaded to vault.');
      setUploadModalOpen(false);
      setSelectedDocFile(null);
      queryClient.invalidateQueries({ queryKey: ['purchase-documents', id] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Upload failed.');
    },
  });

  // Delete Document Mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      return apiClient.delete(`/documents/${docId}`);
    },
    onSuccess: () => {
      toast.success('Document removed.');
      queryClient.invalidateQueries({ queryKey: ['purchase-documents', id] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove document.');
    },
  });

  // Save (Create or Edit) Service Record Mutation
  const saveServiceMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        serviceDate,
        serviceProvider,
        issueDescription,
        repairDescription,
        repairCost: Number(repairCost) || 0,
        warrantyClaimStatus,
      };
      if (editingServiceId) {
        return apiClient.patch(`/services/${editingServiceId}`, payload);
      }
      return apiClient.post(`/purchases/${id}/services`, payload);
    },
    onSuccess: () => {
      toast.success(editingServiceId ? 'Service log entry updated.' : 'Service log entry added.');
      setServiceModalOpen(false);
      setEditingServiceId(null);
      setServiceProvider('');
      setIssueDescription('');
      setRepairDescription('');
      setRepairCost('0');
      queryClient.invalidateQueries({ queryKey: ['purchase-services', id] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save service record.');
    },
  });

  // Delete Service Record Mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return apiClient.delete(`/services/${serviceId}`);
    },
    onSuccess: () => {
      toast.success('Service record deleted.');
      queryClient.invalidateQueries({ queryKey: ['purchase-services', id] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete service record.');
    },
  });

  // Download Document Helper
  const handleDownload = async (doc: PurchaseDocument) => {
    try {
      const res = await apiClient.get(`/documents/${doc._id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error('Could not download document.');
    }
  };

  const formatPrice = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
        Loading purchase specifications...
      </div>
    );
  }

  if (isError || !purchase) {
    return (
      <div className="bg-red-50 p-8 rounded-2xl border border-red-200 text-center text-red-700">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
        <h3 className="font-bold">Purchase Record Unavailable</h3>
        <p className="text-sm mt-1">This product could not be found or you do not have permission to view it.</p>
        <Link to="/purchases" className="mt-4 inline-block font-semibold text-indigo-600 hover:underline">
          Return to purchases
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/purchases')}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {purchase.productName}
              </h2>
              <WarrantyBadge status={purchase.warrantyStatus} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {purchase.brand ? `${purchase.brand} • ` : ''}
              {purchase.category}
              {purchase.modelNumber ? ` • Model: ${purchase.modelNumber}` : ''}
              {purchase.serialNumber ? ` • S/N: ${purchase.serialNumber}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to={`/purchases/${purchase._id}/edit`}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Purchase Amount</span>
          <span className="text-xl font-extrabold text-slate-900">
            {formatPrice(purchase.purchasePrice, purchase.currency)}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {purchase.retailer ? `Via ${purchase.retailer}` : 'Registered Price'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Purchase Date</span>
          <span className="text-base font-bold text-slate-900">
            {format(parseISO(purchase.purchaseDate), 'MMM dd, yyyy')}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Acquired</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Return Window</span>
          <span className="text-base font-bold text-slate-900">
            {purchase.returnDeadline
              ? format(parseISO(purchase.returnDeadline), 'MMM dd, yyyy')
              : 'N/A'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {purchase.returnWindowDays ? `${purchase.returnWindowDays} Days Window` : 'No Return Policy'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Warranty Expiry</span>
          <span className="text-base font-bold text-slate-900">
            {purchase.warrantyExpiryDate
              ? format(parseISO(purchase.warrantyExpiryDate), 'MMM dd, yyyy')
              : 'No Expiry'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {purchase.warrantyProvider || 'Standard Coverage'}
          </span>
        </div>
      </div>

      {/* Lifecycle Timeline */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Product Lifecycle Progression</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Milestone 1 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
              1
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Acquisition</span>
              <p className="text-sm font-bold text-slate-900">
                {format(parseISO(purchase.purchaseDate), 'MMMM dd, yyyy')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Product purchased and registered.</p>
            </div>
          </div>

          {/* Milestone 2 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
              2
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Return Window Closes</span>
              <p className="text-sm font-bold text-slate-900">
                {purchase.returnDeadline
                  ? format(parseISO(purchase.returnDeadline), 'MMMM dd, yyyy')
                  : 'No return period specified'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Last date for hassle-free retailer return.</p>
            </div>
          </div>

          {/* Milestone 3 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
              3
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Warranty Expiry</span>
              <p className="text-sm font-bold text-slate-900">
                {purchase.warrantyExpiryDate
                  ? format(parseISO(purchase.warrantyExpiryDate), 'MMMM dd, yyyy')
                  : 'Indefinite / No Warranty'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Official manufacturer support duration.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Documents Vault & Service History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Vault */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Document Vault</span>
                </h3>
                <p className="text-xs text-slate-400">Invoices, receipts, & warranty certificates</p>
              </div>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>

            {!documents || documents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No documents uploaded yet.</p>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="text-xs font-semibold text-indigo-600 hover:underline mt-1 inline-block"
                >
                  Upload invoice or certificate
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 flex items-center justify-between transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold text-slate-800 truncate">{doc.originalFilename}</p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-semibold text-indigo-600">{doc.documentType}</span>
                        <span>•</span>
                        <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(doc)}
                        title="Authorized Download"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteDocMutation.mutate(doc._id)}
                        title="Delete Document"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Service & Repair History */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  <span>Service & Repair History</span>
                </h3>
                <p className="text-xs text-slate-400">Maintenance logs & warranty claims</p>
              </div>
              <button
                onClick={openCreateServiceModal}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Service</span>
              </button>
            </div>

            {!serviceRecords || serviceRecords.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No service records logged for this product.</p>
                <button
                  onClick={openCreateServiceModal}
                  className="text-xs font-semibold text-indigo-600 hover:underline mt-1 inline-block"
                >
                  Log maintenance or warranty claim
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {serviceRecords.map((sr) => (
                  <div
                    key={sr._id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{sr.serviceProvider}</span>
                      <div className="flex items-center space-x-2">
                        <ClaimBadge status={sr.warrantyClaimStatus} />
                        <button
                          onClick={() => openEditServiceModal(sr)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                          title="Edit Service Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this service log entry?')) {
                              deleteServiceMutation.mutate(sr._id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white transition-colors"
                          title="Delete Service Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-600">{sr.issueDescription}</p>
                    {sr.repairDescription && (
                      <p className="text-slate-500 italic">Resolution: {sr.repairDescription}</p>
                    )}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-200/60">
                      <span>{format(parseISO(sr.serviceDate), 'MMM dd, yyyy')}</span>
                      <span className="font-bold text-slate-800">Cost: ₹{sr.repairCost || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Document to Vault"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document Classification</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="INVOICE">Tax Invoice / Receipt</option>
              <option value="WARRANTY_CERTIFICATE">Warranty Certificate</option>
              <option value="SERVICE_RECEIPT">Service / Repair Receipt</option>
              <option value="OTHER">Other Documentation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Document File (PDF, PNG, JPEG, WEBP - Max 5MB)
            </label>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedDocFile(e.target.files[0]);
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={() => uploadDocMutation.mutate()}
              disabled={!selectedDocFile || uploadDocMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl"
            >
              {uploadDocMutation.isPending ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Log / Edit Service Modal */}
      <Modal
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        title={editingServiceId ? 'Edit Service or Repair Record' : 'Log Service or Repair Record'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service Date</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service Provider</label>
              <input
                type="text"
                value={serviceProvider}
                onChange={(e) => setServiceProvider(e.target.value)}
                placeholder="e.g. Authorized Service Center"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Problem / Issue Description</label>
            <input
              type="text"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="e.g. Battery draining quickly, display flickering"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Repair / Resolution (Optional)</label>
            <textarea
              rows={2}
              value={repairDescription}
              onChange={(e) => setRepairDescription(e.target.value)}
              placeholder="e.g. Replaced battery module under warranty"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Repair Cost (₹)</label>
              <input
                type="number"
                value={repairCost}
                onChange={(e) => setRepairCost(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty Claim Status</label>
              <select
                value={warrantyClaimStatus}
                onChange={(e) => setWarrantyClaimStatus(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="NOT_APPLICABLE">Not Applicable (Paid)</option>
                <option value="PENDING">Claim Pending</option>
                <option value="APPROVED">Claim Approved (Free)</option>
                <option value="REJECTED">Claim Rejected</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setServiceModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={() => saveServiceMutation.mutate()}
              disabled={!serviceProvider || !issueDescription || saveServiceMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl"
            >
              {saveServiceMutation.isPending ? 'Saving...' : editingServiceId ? 'Update Record' : 'Save Log Entry'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
