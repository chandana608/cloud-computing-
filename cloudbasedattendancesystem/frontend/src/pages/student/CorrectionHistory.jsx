import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { History, Clock, CheckCircle2, XCircle } from 'lucide-react';

export const CorrectionHistory = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await api.get('/correction-requests');
        if (res.success) setRequests(res.data);
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          My Correction Requests & Status
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Track the formal review lifecycle of your submitted attendance correction requests.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Date Submitted</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Change Requested</th>
                <th className="px-6 py-3.5">Reason Submitted</th>
                <th className="px-6 py-3.5">Current Status</th>
                <th className="px-6 py-3.5">Faculty Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-xs text-slate-500 font-mono">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="font-semibold text-brand-600">{r.subject_code}</span>
                    <span className="text-xs text-slate-500 block">{r.session_date}</span>
                  </td>
                  <td className="px-6 py-3.5 text-xs">
                    <span className="line-through text-rose-500 mr-1">{r.original_status}</span>
                    <span className="font-bold text-emerald-600">&rarr; {r.requested_status}</span>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-700 max-w-xs truncate" title={r.reason}>
                    {r.reason}
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={r.status} size="xs" />
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-500">
                    {r.reviewer_comments ? (
                      <span className="text-slate-800 font-medium">"{r.reviewer_comments}"</span>
                    ) : (
                      <span className="text-slate-400 italic">Pending instructor review</span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                    You have not submitted any attendance correction requests.
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
