import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { ShieldAlert, Search, RefreshCw, Clock } from 'lucide-react';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/audit-logs');
      if (res.success) setLogs(res.data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Security & System Audit Logs
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Immutable tracking of administrative modifications, finalized session overrides, and logins.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Target Entity</th>
                <th className="px-6 py-3.5">Justification / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-xs text-slate-500 whitespace-nowrap font-mono">
                    {l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-3.5 text-xs">
                    <p className="font-semibold text-slate-800">{l.actor_name || l.actor_user_id}</p>
                    {l.actor_role && (
                      <span className="text-[10px] uppercase font-bold text-brand-600">
                        {l.actor_role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-600">
                    {l.entity_type} {l.entity_id ? `(${l.entity_id.slice(-6)})` : ''}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-500">
                    {l.reason || l.new_value ? (
                      <span className="truncate max-w-xs block">
                        {l.reason || JSON.stringify(l.new_value)}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400 text-sm">
                    No audit events recorded yet.
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
