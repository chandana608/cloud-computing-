import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Cloud, User, LogOut, Bell } from 'lucide-react';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          aria-label="Toggle navigation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Institution Branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 text-sm sm:text-base leading-tight">
              Cloud Attendance
            </h1>
            <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
              Centralized Academic Registry
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Cloud Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Cloud Online</span>
        </div>

        {/* User Profile Info */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700 leading-tight">
              {user?.full_name || 'Academic User'}
            </p>
            <p className="text-xs text-brand-600 font-medium capitalize">
              {user?.role || 'Guest'}
            </p>
          </div>

          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
