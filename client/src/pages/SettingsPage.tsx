import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Trash2, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    setUpdatingProfile(true);
    try {
      const res = await apiClient.patch('/auth/profile', data);
      if (res.data.success) {
        updateUser(res.data.data);
        toast.success('Profile name updated.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setUpdatingPassword(true);
    try {
      const res = await apiClient.patch('/auth/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (res.data.success) {
        toast.success('Password updated successfully.');
        resetPassword();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiClient.delete('/auth/account');
      toast.success('Account deleted.');
      logout();
    } catch (e: any) {
      toast.error('Could not delete account.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Account Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your personal profile, security credentials, and vault preferences
        </p>
      </div>

      {/* Section 1: Profile Details */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm uppercase tracking-wider pb-3 border-b border-slate-100">
          <User className="w-4 h-4" />
          <span>Profile Information</span>
        </div>

        <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              {...registerProfile('name')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            {profileErrors.name && (
              <p className="text-xs text-red-500 mt-1">{profileErrors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-400 mt-1">Email addresses are unique and cannot be changed.</p>
          </div>

          <button
            type="submit"
            disabled={updatingProfile}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
          >
            {updatingProfile ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Update Profile</span>
            )}
          </button>
        </form>
      </div>

      {/* Section 2: Security & Password */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm uppercase tracking-wider pb-3 border-b border-slate-100">
          <Lock className="w-4 h-4" />
          <span>Security & Password</span>
        </div>

        <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              {...registerPassword('currentPassword')}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            {passwordErrors.currentPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (min. 8 characters)</label>
            <input
              type="password"
              {...registerPassword('newPassword')}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            {passwordErrors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              {...registerPassword('confirmPassword')}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            {passwordErrors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={updatingPassword}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
          >
            {updatingPassword ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Changing Password...</span>
              </>
            ) : (
              <span>Change Password</span>
            )}
          </button>
        </form>
      </div>

      {/* Section 3: Danger Zone */}
      <div className="bg-red-50/50 p-6 sm:p-8 rounded-2xl border border-red-100 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm uppercase tracking-wider pb-3 border-b border-red-100">
          <Trash2 className="w-4 h-4" />
          <span>Danger Zone</span>
        </div>

        <p className="text-sm text-slate-600">
          Permanently delete your account along with all purchases, uploaded documents, warranty reminders, and service logs. This action cannot be reversed.
        </p>

        <button
          onClick={() => setDeleteModalOpen(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Account Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you absolutely sure you want to delete your account? All registered purchases, documents, and historical records will be deleted immediately.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              Confirm Account Deletion
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
