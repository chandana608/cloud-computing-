import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell
} from 'recharts';

export const SubjectAnalytics = () => {
  const { user } = useAuth();
  const [subjectData, setSubjectData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const studentId = user?.profile?.id || user?.profile?._id;
        if (studentId) {
          const res = await api.get(`/students/${studentId}/attendance`);
          if (res.success) {
            setSubjectData(res.data.subject_wise || []);
          }
        }
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  const chartData = subjectData.map((s) => ({
    code: s.subject_code,
    name: s.subject_name,
    percentage: s.percentage || 0,
    attended: s.attended,
    eligible: s.eligible,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Subject-Wise Attendance Analytics
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Comparative performance analytics across all enrolled curriculum courses.
        </p>
      </div>

      {/* Bar Chart comparing subjects */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-base">
            Attendance Percentage vs. 75% Requirement Line
          </h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
            Red line = 75% Minimum Policy
          </span>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="code" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                formatter={(val) => [`${val}%`, 'Attendance']}
              />
              <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={2} label={{ value: '75% Required', fill: '#f43f5e', fontSize: 11, position: 'top' }} />
              <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.percentage >= 80 ? '#10b981' : entry.percentage >= 75 ? '#f59e0b' : '#f43f5e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjectData.map((s) => (
          <div
            key={s.subject_id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between"
          >
            <div>
              <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                {s.subject_code}
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-1">{s.subject_name}</h4>
              <p className="text-xs text-slate-500 mt-1">
                Attended: <strong>{s.attended}</strong> / {s.eligible} Eligible Sessions
              </p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-extrabold ${s.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {s.percentage !== null ? `${s.percentage}%` : 'N/A'}
              </span>
              <p className="text-[11px] text-slate-400 font-medium uppercase mt-0.5">{s.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
