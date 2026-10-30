import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';

export const Unauthorized = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-lg">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-2">
          You do not have permission to view this section of the attendance portal.
        </p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-lg">
        <h1 className="text-6xl font-extrabold text-slate-300">404</h1>
        <h2 className="text-xl font-bold text-slate-800 mt-2">Page Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">
          The page or academic record you are searching for does not exist.
        </p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Link>
        </div>
      </div>
    </div>
  );
};
