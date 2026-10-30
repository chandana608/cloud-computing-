import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { CalendarCheck, Plus, Clock, ArrowRight } from 'lucide-react';

export const FacultySessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const res = await api.get('/attendance/sessions');
        if (res.success) setSessions(res.data);
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Attendance Sessions
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            History of all conducted, open, and finalized register sessions.
          </p>
        </div>
        <Link
          to="/faculty/sessions/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Session Date</th>
                <th className="px-6 py-3.5">Time Slot</th>
                <th className="px-6 py-3.5">Class & Section</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-800">
                    {sess.session_date}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-500">
                    {sess.start_time} - {sess.end_time}
                  </td>
                  <td className="px-6 py-3.5 text-xs font-medium text-slate-700">
                    {sess.class_name}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="font-semibold text-brand-600">{sess.subject_code}</span>
                    <span className="text-xs text-slate-500 block">{sess.subject_name}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={sess.status} size="xs" />
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link
                      to={`/faculty/sessions/${sess.id}/mark`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      <span>{sess.status === 'Finalized' ? 'View Register' : 'Mark / Edit'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                    No sessions recorded yet. Click "New Session" to start.
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
