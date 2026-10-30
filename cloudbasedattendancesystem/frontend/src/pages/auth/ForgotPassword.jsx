import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Mail, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      const res = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      if (res?.data?.reset_token_dev) {
        setResetToken(res.data.reset_token_dev);
      }
      toast.success('Password reset instructions generated.');
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 items-center justify-center text-indigo-600 mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Reset Password
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your registered institutional email address
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-200/80 sm:px-10">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="mt-1.5 relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@college.edu"
                    className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Request Processed</h3>
              <p className="text-xs text-slate-500 mt-1">
                If the email exists, reset instructions have been generated.
              </p>
              {resetToken && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Dev Mode Reset Token:
                  </p>
                  <code className="text-xs text-indigo-600 break-all select-all font-mono">
                    {resetToken}
                  </code>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
