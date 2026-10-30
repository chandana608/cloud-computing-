import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import {
  BookOpen,
  Building2,
  CalendarCheck,
  Clock,
  Plus,
  ArrowRight,
  ClipboardCheck,
  CheckCircle2
} from 'lucide-react';

export const FacultyDashboard = () => {
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [openSessions, setOpenSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacultyData = async () => {
      try {
        setLoading(true);
        const [statsRes, assignRes, sessRes] = await Promise.all([
          api.get('/reports/dashboard-stats'),
          api.get('/faculty/me/classes'),
          api.get('/attendance/sessions?status=Open')
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (assignRes.success) setAssignments(assignRes.data);
        if (sessRes.success) setOpenSessions(sessRes.data);
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    fetchFacultyData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Faculty Attendance Portal
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Conduct live attendance sessions, mark enrolled students, and inspect subject metrics.
          </p>
        </div>
        <Link
          to="/faculty/sessions/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Attendance Session</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Classes"
          value={assignments?.classes?.length || 0}
          subtitle="Class cohorts mapped"
          icon={Building2}
          color="indigo"
        />
        <StatCard
          title="Teaching Subjects"
          value={assignments?.subjects?.length || 0}
          subtitle="Curriculum courses"
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Sessions Conducted"
          value={stats?.total_sessions_conducted || 0}
          subtitle="Semester to date"
          icon={CalendarCheck}
          color="purple"
        />
        <StatCard
          title="Open Sessions"
          value={openSessions.length}
          subtitle="Awaiting finalization"
          icon={Clock}
          color={openSessions.length > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Open Sessions Waiting for Attendance */}
      {openSessions.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-800">
              <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
              <h3 className="font-semibold text-sm">Open Attendance Session in Progress</h3>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Live Session
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {openSessions.map((sess) => (
              <div
                key={sess.id}
                className="bg-white p-4 rounded-xl border border-amber-200/80 flex items-center justify-between shadow-xs"
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {sess.subject_code} - {sess.subject_name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sess.class_name} • {sess.session_date} ({sess.start_time} - {sess.end_time})
                  </p>
                </div>
                <Link
                  to={`/faculty/sessions/${sess.id}/mark`}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors shadow-xs"
                >
                  Mark Attendance &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Classes and Courses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
            My Assigned Academic Subjects
          </h3>
          <Link to="/faculty/reports" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View full reports
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Subject Code</th>
                <th className="px-6 py-3.5">Subject Name</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Credits</th>
                <th className="px-6 py-3.5 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments?.subjects?.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-mono font-bold text-brand-600">
                    {sub.subject_code}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-800">
                    {sub.subject_name}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-500">
                    {sub.department}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-600">
                    {sub.credits} Credits
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link
                      to="/faculty/sessions/new"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      <span>Conduct Session</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
