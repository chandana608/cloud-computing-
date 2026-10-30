import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User, Lock, Mail, GraduationCap, Building2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentProfile = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // Handled
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          My Academic Profile
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Review your enrolled institutional credentials and manage your account security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-lg border border-brand-200">
              {user?.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{user?.full_name}</h3>
              <p className="text-xs text-brand-600 font-semibold font-mono">
                Roll No: {user?.profile?.roll_number || user?.institution_id}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Institutional Email</span>
              <span className="text-slate-800 font-semibold">{user?.email}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Department</span>
              <span className="text-slate-800 font-semibold">
                {user?.profile?.department || 'Computer Science & Engineering'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block font-medium">Section</span>
                <span className="text-slate-800 font-semibold">{user?.profile?.section || 'A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Semester</span>
                <span className="text-slate-800 font-semibold">Semester {user?.profile?.semester || 5}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Academic Year</span>
              <span className="text-slate-800 font-semibold">{user?.profile?.academic_year || '2026-2027'}</span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4 text-slate-800 font-bold text-base">
            <Lock className="w-4 h-4 text-brand-600" />
            <span>Update Account Password</span>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Updating...' : 'Change Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
