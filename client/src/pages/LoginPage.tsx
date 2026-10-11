import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Eye, EyeOff, Loader2, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = new URLSearchParams(location.search).get('expired') === 'true';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/auth/login', data);
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        toast.success(`Welcome back, ${res.data.data.user.name}!`);
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your account email.');
      return;
    }
    setIsResetting(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email: resetEmail });
      toast.success(res.data.data.message || 'Reset code sent.');
      if (res.data.data.resetCode) {
        setResetCode(res.data.data.resetCode);
        toast(`Dev Demo Code: ${res.data.data.resetCode}`, { icon: '🔑', duration: 8000 });
      }
      setResetStep('reset');
    } catch (err: any) {
      toast.error(err.message || 'Failed to request reset code.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || newPassword.length < 8) {
      toast.error('Please provide the reset code and a new password with at least 8 characters.');
      return;
    }
    setIsResetting(true);
    try {
      const res = await apiClient.post('/auth/reset-password', {
        email: resetEmail,
        resetCode: resetCode.trim(),
        newPassword,
      });
      toast.success(res.data.data.message || 'Password reset successfully!');
      setForgotModalOpen(false);
      setResetStep('request');
      setResetCode('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-4 shadow-sm shadow-indigo-100">
            <ShieldCheck className="w-6 h-6" />
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In to ProofCart</h2>
          <p className="text-sm text-slate-500 mt-1">Access your purchases and warranty documents</p>
        </div>

        {isExpired && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-xs text-amber-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Session Expired</p>
              <p className="mt-0.5">Your session has expired. Please sign in to resume your session.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                errors.email ? 'border-red-300 bg-red-50/50' : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600'
              }`}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotModalOpen(true);
                  setResetStep('request');
                }}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm pr-10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                  errors.password ? 'border-red-300 bg-red-50/50' : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Vault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot / Reset Password Modal (UX-01) */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title={resetStep === 'request' ? 'Reset Your Password' : 'Enter Reset Code'}
        maxWidth="max-w-md"
      >
        {resetStep === 'request' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              Enter the email address registered with your account. We will issue a secure 6-digit recovery code valid for 15 minutes.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Account Email
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isResetting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5"
              >
                {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Reset Code</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              Enter the 6-digit verification code and your new password.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                6-Digit Code
              </label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="123456"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                New Password (min 8 characters)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setResetStep('request')}
                className="text-xs text-indigo-600 hover:underline"
              >
                Back to email
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                >
                  {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Set New Password</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
