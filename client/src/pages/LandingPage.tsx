import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Calendar, FileText, Wrench, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="h-20 bg-white border-b border-slate-200 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">ProofCart</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 block -mt-1">
              Personal Vault
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <span>Go to Vault</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center flex flex-col items-center justify-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4" />
          <span>Every purchase. Every warranty. One place.</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl mb-6">
          Your personal purchase & warranty command center.
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mb-10 leading-relaxed">
          Never misplace an invoice, miss a return deadline, or let an expensive warranty expire unnoticed again.
          ProofCart organizes your entire consumer electronics and appliance lifecycle securely.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link
            to={user ? '/dashboard' : '/register'}
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center justify-center space-x-2"
          >
            <span>{user ? 'Enter Your Vault' : 'Create Free Vault Account'}</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base rounded-xl border border-slate-200 transition-all"
          >
            Sign In to Existing Vault
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Automated Expiry Engine</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Calculates authoritative calendar-month warranty expiry and retailer return deadlines with zero guesswork.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Private Document Vault</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Safely store invoices and warranty certificates. Files are never public and stream only to authenticated owners.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Repair & Service History</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Track maintenance logs, service costs, and warranty claim approvals for your high-value appliances.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 sm:px-12 text-center text-xs text-slate-400">
        ProofCart — Built for StartupMeu Software Engineer Assessment (MERN Stack). All rights reserved.
      </footer>
    </div>
  );
}
