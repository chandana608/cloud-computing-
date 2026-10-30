import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Cloud, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('Please enter both identifier and password.');
      return;
    }

    try {
      setLoading(true);
      const user = await login(identifier, password);
      toast.success(`Welcome back, ${user.full_name}!`);

      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'faculty') {
        navigate('/faculty/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      // Error handled by Axios interceptor toast
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoIdentifier, demoPassword) => {
    setIdentifier(demoIdentifier);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 to-indigo-500 items-center justify-center text-white shadow-lg shadow-brand-500/25 mb-4">
          <Cloud className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Cloud Attendance System
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Centralized Cloud Academic Attendance & Records Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-200/80 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Email or Institution ID
              </label>
              <div className="mt-1.5 relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@college.edu or 23CS001"
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-brand-600 hover:text-brand-500"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1.5 relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Demonstration Quick-Fill Helper */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 text-center">
              Demonstration Quick Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@college.edu', 'Admin@123')}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 text-slate-700 transition-all text-xs"
              >
                <ShieldCheck className="w-4 h-4 text-brand-600 mb-1" />
                <span className="font-medium">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('faculty.cs@college.edu', 'Faculty@123')}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 text-slate-700 transition-all text-xs"
              >
                <UserCheck className="w-4 h-4 text-indigo-600 mb-1" />
                <span className="font-medium">Faculty</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('23cs001@college.edu', 'Student@123')}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 text-slate-700 transition-all text-xs"
              >
                <GraduationCap className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="font-medium">Student</span>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Cloud-Hosted on Render / Vercel with MongoDB Atlas Central Database
        </p>
      </div>
    </div>
  );
};
