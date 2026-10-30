import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  CalendarCheck,
  Check,
  X,
  Clock,
  ShieldCheck,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

export const MarkAttendance = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Finalization state
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/attendance/sessions/${id}`);
      if (res.success) {
        setSession(res.data);
        setStudents(res.data.students || []);
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, [id]);

  // Bulk Marking
  const handleMarkAll = (status) => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: status
      }))
    );
    toast.success(`Marked all students as ${status}.`);
  };

  // Toggle single student status
  const handleStatusChange = (studentId, newStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status: newStatus } : s))
    );
  };

  // Update single student remarks
  const handleRemarksChange = (studentId, remarks) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, remarks } : s))
    );
  };

  // Save records to MongoDB
  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      const recordsPayload = students.map((s) => ({
        student_id: s.student_id,
        status: s.status,
        remarks: s.remarks || ''
      }));

      const body = { records: recordsPayload };
      if (session.status === 'Finalized') {
        if (!correctionReason.trim()) {
          toast.error('Session is finalized. Please enter a correction reason.');
          setSaving(false);
          return;
        }
        body.correction_reason = correctionReason;
      }

      const res = await api.post(`/attendance/sessions/${id}/records`, body);
      toast.success(res.message || 'Attendance saved to cloud database!');
      setCorrectionReason('');
      fetchSessionData();
    } catch {
      // Handled
    } finally {
      setSaving(false);
    }
  };

  // Finalize Session
  const handleFinalize = async () => {
    try {
      await api.post(`/attendance/sessions/${id}/finalize`);
      toast.success('Session finalized and locked!');
      setIsFinalizeModalOpen(false);
      fetchSessionData();
    } catch {
      // Handled
    }
  };

  // Tally counts
  const presentCount = students.filter((s) => s.status === 'Present').length;
  const absentCount = students.filter((s) => s.status === 'Absent').length;
  const lateCount = students.filter((s) => s.status === 'Late').length;
  const excusedCount = students.filter((s) => s.status === 'Excused').length;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-2xl"></div>
        <div className="h-96 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  const isFinalized = session?.status === 'Finalized';

  return (
    <div className="space-y-6">
      {/* Back button and Header Banner */}
      <button
        onClick={() => navigate('/faculty/sessions')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Sessions List
      </button>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200">
              {session?.subject_code}
            </span>
            <h2 className="text-xl font-bold text-slate-900">{session?.subject_name}</h2>
            <StatusBadge status={session?.status} size="xs" />
          </div>

          <p className="text-xs text-slate-500 mt-1">
            {session?.class_name} • {session?.session_date} ({session?.start_time} - {session?.end_time}) • {session?.session_type} • {session?.room || 'Main Hall'}
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            {presentCount} Present
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
            {absentCount} Absent
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
            {lateCount} Late
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
            {excusedCount} Excused
          </span>
        </div>
      </div>

      {/* Finalized Notice Warning */}
      {isFinalized && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-amber-800 text-xs font-medium">
            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              This session is <strong>Finalized & Locked</strong>. Any modifications require a documented justification reason for the audit trail.
            </span>
          </div>

          <input
            type="text"
            required
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            placeholder="Enter mandatory correction reason..."
            className="w-full sm:w-80 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      )}

      {/* Action Bar (Bulk Marking + Save) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500 mr-1">Bulk Action:</span>
          <button
            onClick={() => handleMarkAll('Present')}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors"
          >
            Mark All Present
          </button>
          <button
            onClick={() => handleMarkAll('Absent')}
            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold border border-rose-200 transition-colors"
          >
            Mark All Absent
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Records'}</span>
          </button>

          {!isFinalized && (
            <button
              onClick={() => setIsFinalizeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-black shadow-sm transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Finalize Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Roll Number</th>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-6 py-3.5 text-center">Attendance Status</th>
                <th className="px-6 py-3.5">Remarks (Optional)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((st) => (
                <tr key={st.student_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-mono font-bold text-slate-800">
                    {st.roll_number}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-800">
                    {st.full_name}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {['Present', 'Absent', 'Late', 'Excused'].map((statusOption) => {
                        const isSelected = st.status === statusOption;
                        let activeClass = '';
                        if (isSelected) {
                          if (statusOption === 'Present') activeClass = 'bg-emerald-600 text-white shadow-xs';
                          else if (statusOption === 'Absent') activeClass = 'bg-rose-600 text-white shadow-xs';
                          else if (statusOption === 'Late') activeClass = 'bg-amber-500 text-white shadow-xs';
                          else if (statusOption === 'Excused') activeClass = 'bg-blue-600 text-white shadow-xs';
                        } else {
                          activeClass = 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200';
                        }

                        return (
                          <button
                            key={statusOption}
                            type="button"
                            onClick={() => handleStatusChange(st.student_id, statusOption)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${activeClass}`}
                          >
                            {statusOption}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <input
                      type="text"
                      value={st.remarks || ''}
                      onChange={(e) => handleRemarksChange(st.student_id, e.target.value)}
                      placeholder="e.g. Arrived 15m late, sick note"
                      className="w-full px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white transition-all"
                    />
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-400 text-sm">
                    No students currently enrolled in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finalize Confirmation Modal */}
      <Modal isOpen={isFinalizeModalOpen} onClose={() => setIsFinalizeModalOpen(false)} title="Finalize Attendance Session">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p>
              Finalizing will lock this register session. Subsequent modifications will require an authorized justification reason and will be permanently recorded in the institutional audit log.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <p><strong>Present:</strong> {presentCount}</p>
            <p><strong>Absent:</strong> {absentCount}</p>
            <p><strong>Late:</strong> {lateCount}</p>
            <p><strong>Excused:</strong> {excusedCount}</p>
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsFinalizeModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalize}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-black shadow-sm"
            >
              Confirm & Lock Session
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
