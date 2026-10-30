import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Settings, Cloud, Database, ShieldCheck, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsPage = () => {
  const [settings, setSettings] = useState({
    institution_name: '',
    min_attendance_threshold: 75.0,
    warning_attendance_threshold: 80.0,
    academic_year: '2026-2027',
    current_semester: 'Semester 5 (Fall 2026)'
  });
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [setRes, readyRes] = await Promise.all([
          api.get('/admin/settings'),
          api.get('/ready')
        ]);
        if (setRes.success) setSettings(setRes.data);
        setReadiness(readyRes);
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/settings', settings);
      toast.success('Institutional academic settings saved.');
    } catch {
      // Handled
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          System & Institutional Settings
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Adjust institutional attendance criteria, academic terms, and inspect cloud database infrastructure.
        </p>
      </div>

      {/* Cloud Health Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              Cloud Database Connectivity
            </h3>
            <p className="text-xs text-slate-500">
              {readiness?.database_status || 'Checking cluster state...'}
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
          {readiness?.database_mode === 'mongodb_atlas' ? 'MongoDB Atlas Cluster' : 'Resilient In-Memory Mode'}
        </span>
      </div>

      {/* Settings Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Institution Name
            </label>
            <input
              type="text"
              required
              value={settings.institution_name}
              onChange={(e) => setSettings({ ...settings, institution_name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Minimum Attendance Threshold (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="50"
                max="100"
                required
                value={settings.min_attendance_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, min_attendance_threshold: parseFloat(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-rose-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Students below this percentage are classified as Defaulters.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Warning Threshold (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="50"
                max="100"
                required
                value={settings.warning_attendance_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, warning_attendance_threshold: parseFloat(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-amber-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Students between minimum and warning thresholds receive attendance warnings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current Academic Year
              </label>
              <input
                type="text"
                required
                value={settings.academic_year}
                onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current Semester Session
              </label>
              <input
                type="text"
                required
                value={settings.current_semester}
                onChange={(e) => setSettings({ ...settings, current_semester: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
