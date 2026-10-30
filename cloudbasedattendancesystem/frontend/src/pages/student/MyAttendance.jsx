import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { CalendarCheck, Filter, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const MyAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Correction Request Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [requestedStatus, setRequestedStatus] = useState('Present');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const studentId = user?.profile?.id || user?.profile?._id;
      if (studentId) {
        const res = await api.get(`/students/${studentId}/attendance`);
        if (res.success) {
          setRecords(res.data.history || []);
          setSubjects(res.data.subject_wise || []);
        }
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user]);

  const openCorrectionModal = (rec) => {
    setSelectedRecord(rec);
    setRequestedStatus('Present');
    setReason('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a descriptive reason.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/correction-requests', {
        attendance_record_id: selectedRecord.record_id,
        requested_status: requestedStatus,
        reason: reason.trim(),
        supporting_notes: notes.trim()
      });
      toast.success('Correction request submitted for faculty review!');
      setIsModalOpen(false);
    } catch {
      // Handled
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (selectedSubject && r.subject_id !== selectedSubject) return false;
    if (selectedStatus && r.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Attendance History & Grievances
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Complete daily register logs with the ability to submit authorized correction requests.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-60"
          >
            <option value="">All Enrolled Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.subject_id} value={sub.subject_id}>
                {sub.subject_code} - {sub.subject_name}
              </option>
            ))}
          </select>
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-auto"
        >
          <option value="">All Statuses</option>
          <option value="Present">Present Only</option>
          <option value="Absent">Absent Only</option>
          <option value="Late">Late Only</option>
          <option value="Excused">Excused Only</option>
        </select>
      </div>

      {/* Register Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Session Date</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Marked Status</th>
                <th className="px-6 py-3.5">Remarks / Reason</th>
                <th className="px-6 py-3.5 text-right">Correction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((rec) => (
                <tr key={rec.record_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-800">
                    {rec.session_date}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="font-semibold text-brand-600">{rec.subject_code}</span>
                    <span className="text-xs text-slate-500 block">{rec.subject_name}</span>
                  </td>
                  <td className="px-6 py-3.5 text-xs">{rec.session_type}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={rec.status} size="xs" />
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-500">
                    {rec.correction_reason ? (
                      <span className="text-brand-600 font-medium">{rec.correction_reason}</span>
                    ) : (
                      rec.remarks || '-'
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {rec.status === 'Absent' || rec.status === 'Late' ? (
                      <button
                        onClick={() => openCorrectionModal(rec)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 text-xs font-semibold border border-slate-200 transition-colors"
                      >
                        Request Fix
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                    No attendance records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Correction Request Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit Attendance Correction Request">
        <form onSubmit={handleCorrectionSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <p><strong>Subject:</strong> {selectedRecord?.subject_code} - {selectedRecord?.subject_name}</p>
            <p><strong>Date:</strong> {selectedRecord?.session_date}</p>
            <p><strong>Currently Marked:</strong> <span className="text-rose-600 font-bold">{selectedRecord?.status}</span></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Requested Status *
            </label>
            <select
              value={requestedStatus}
              onChange={(e) => setRequestedStatus(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="Present">Present (I was in attendance)</option>
              <option value="Excused">Excused (Medical certificate / Approved leave)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Correction *
            </label>
            <textarea
              rows="3"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why this record needs correction (at least 5 characters)..."
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Supporting Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Medical slip submitted to department office"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
