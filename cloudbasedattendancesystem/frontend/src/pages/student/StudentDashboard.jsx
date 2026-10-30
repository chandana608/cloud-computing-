import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PercentageGauge } from '../../components/PercentageGauge';
import { StatusBadge } from '../../components/StatusBadge';
import {
  AlertTriangle,
  CheckCircle2,
  CalendarCheck,
  BookOpen,
  History,
  ArrowRight,
  TrendingUp,
  Percent
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const studentId = user?.profile?.id || user?.profile?._id;
        if (studentId) {
          const res = await api.get(`/students/${studentId}/attendance`);
          if (res.success) {
            setAttendanceData(res.data);
          }
        }
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [user]);

  const overall = attendanceData?.overall;
  const isDefaulter = overall?.category === 'Defaulter';
  const isWarning = overall?.category === 'Warning';

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Welcome & Profile Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200">
            {user?.profile?.roll_number || '23CS001'}
          </span>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            Welcome, {user?.full_name}!
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {user?.profile?.class_details?.name || 'Computer Science & Engineering'} • Section {user?.profile?.section || 'A'} • Semester {user?.profile?.semester || 5}
          </p>
        </div>

        {/* Overall Percentage Radial Gauge */}
        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
          <PercentageGauge
            percentage={overall?.percentage}
            category={overall?.category}
            attended={overall?.attended_sessions}
            eligible={overall?.eligible_sessions}
            size="lg"
            showDetails={false}
          />
          <div className="pr-3">
            <p className="text-xs font-bold text-slate-800">Overall Attendance</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {overall?.attended_sessions || 0} / {overall?.eligible_sessions || 0} Sessions
            </p>
            <div className="mt-2">
              <StatusBadge status={overall?.category || 'Safe'} size="xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Warning/Defaulter Alert Banner */}
      {isDefaulter && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3.5 text-rose-800">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-sm text-rose-900">Attendance Defaulter Warning</h4>
            <p className="mt-0.5">
              Your overall attendance is currently at <strong>{overall?.percentage}%</strong>, which is below the institution's mandatory <strong>75%</strong> requirement. Regular attendance is required to be eligible for semester examinations.
            </p>
          </div>
        </div>
      )}

      {isWarning && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-sm text-amber-900">Attendance Caution Notice</h4>
            <p className="mt-0.5">
              Your overall attendance is approaching the minimum requirement at <strong>{overall?.percentage}%</strong>. Please ensure you attend upcoming classes to avoid becoming a defaulter.
            </p>
          </div>
        </div>
      )}

      {/* Subject Attendance Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-base">Enrolled Subject Percentages</h3>
          <Link
            to="/student/analytics"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>View Comparison Chart</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {attendanceData?.subject_wise?.map((sub) => (
            <div
              key={sub.subject_id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow flex items-center justify-between"
            >
              <div className="flex-1 pr-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {sub.subject_code}
                </span>
                <h4 className="font-bold text-slate-800 text-sm mt-2 line-clamp-1">
                  {sub.subject_name}
                </h4>
                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  <p>Present: <strong>{sub.present}</strong> | Absent: <strong>{sub.absent}</strong></p>
                  <p>Late: {sub.late} | Excused: {sub.excused}</p>
                </div>
              </div>

              <div className="flex-shrink-0">
                <PercentageGauge
                  percentage={sub.percentage}
                  category={sub.category}
                  attended={sub.attended}
                  eligible={sub.eligible}
                  size="sm"
                  showDetails={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Attendance Register Entries */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
            Recent Attendance History
          </h3>
          <Link
            to="/student/attendance"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            View full log
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Session Type</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceData?.history?.slice(0, 6).map((rec) => (
                <tr key={rec.record_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-slate-800">{rec.session_date}</td>
                  <td className="px-6 py-3.5">
                    <span className="font-semibold text-brand-600">{rec.subject_code}</span>
                    <span className="text-xs text-slate-500 block">{rec.subject_name}</span>
                  </td>
                  <td className="px-6 py-3.5 text-xs">{rec.session_type}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={rec.status} size="xs" />
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-500">
                    {rec.remarks || '-'}
                  </td>
                </tr>
              ))}
              {(!attendanceData?.history || attendanceData.history.length === 0) && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400 text-sm">
                    No attendance records logged yet.
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
