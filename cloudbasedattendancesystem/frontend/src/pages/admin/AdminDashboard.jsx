import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  CalendarCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/reports/dashboard-stats');
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const chartData = [
    { name: 'Safe (>=80%)', count: 24, fill: '#10b981' },
    { name: 'Warning (75-79%)', count: 5, fill: '#f59e0b' },
    { name: 'Defaulters (<75%)', count: 3, fill: '#f43f5e' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Attendance Overview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time telemetry and database analytics from MongoDB Atlas cloud cluster.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/reports"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
          >
            <span>View Defaulters</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Students"
          value={stats?.total_students || 0}
          subtitle="Enrolled across sections"
          icon={GraduationCap}
          color="indigo"
        />
        <StatCard
          title="Faculty Members"
          value={stats?.total_faculty || 0}
          subtitle="Department instructors"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Sessions Conducted"
          value={stats?.total_sessions || 0}
          subtitle={`${stats?.today_sessions_count || 0} sessions today`}
          icon={CalendarCheck}
          color="purple"
        />
        <StatCard
          title="Institutional Average"
          value={stats?.institutional_average !== null ? `${stats.institutional_average}%` : 'N/A'}
          subtitle={`Overall Status: ${stats?.institutional_category || 'Safe'}`}
          icon={Percent}
          color={stats?.institutional_average >= 75 ? 'emerald' : 'rose'}
        />
      </div>

      {/* Charts & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800 text-base">
                Student Attendance Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Categorized against the 75% minimum institutional policy threshold.
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Correction Alert Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-amber-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold text-slate-800 text-base">Action Required</h3>
            </div>
            <p className="text-xs text-slate-500">
              There are currently{' '}
              <span className="font-bold text-amber-600">{stats?.pending_corrections || 0}</span> pending
              student attendance correction requests awaiting academic review.
            </p>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-medium text-slate-700">Audit & Accountability</p>
            <p className="text-[11px] text-slate-500 mt-1">
              All manual changes to finalized registers require mandatory justification and are logged.
            </p>
            <Link
              to="/admin/corrections"
              className="mt-3 block text-center py-2 px-3 bg-white border border-slate-200 text-brand-600 text-xs font-semibold rounded-lg hover:bg-brand-50 transition-colors"
            >
              Review Requests
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
            Recent Attendance Sessions
          </h3>
          <Link
            to="/admin/sessions"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View all sessions
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Class</th>
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3">Session Type</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recent_sessions?.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-slate-800">
                    {sess.session_date} <span className="text-slate-400 font-normal text-xs ml-1">({sess.start_time})</span>
                  </td>
                  <td className="px-6 py-3.5">{sess.class_name}</td>
                  <td className="px-6 py-3.5 font-medium text-brand-600">{sess.subject_name}</td>
                  <td className="px-6 py-3.5">{sess.session_type}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={sess.status} size="xs" />
                  </td>
                </tr>
              ))}
              {(!stats?.recent_sessions || stats.recent_sessions.length === 0) && (
                <tr>
                  <td colSpan="5" className="px-6 py-6 text-center text-slate-400 text-xs">
                    No attendance sessions conducted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
