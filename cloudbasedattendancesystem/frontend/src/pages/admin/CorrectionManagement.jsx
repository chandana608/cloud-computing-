import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { ClipboardCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export const CorrectionManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReq, setSelectedReq] = useState(null);
  const [reviewAction, setReviewAction] = useState('Approved');
  const [comments, setComments] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/correction-requests', { params });
      if (res.success) setRequests(res.data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const openReview = (req, action) => {
    setSelectedReq(req);
    setReviewAction(action);
    setComments(action === 'Approved' ? 'Verified records and documentation. Approved.' : 'Insufficient justification provided.');
    setIsReviewOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/correction-requests/${selectedReq.id}`, {
        action: reviewAction,
        reviewer_comments: comments
      });
      toast.success(`Correction request ${reviewAction.toLowerCase()}!`);
      setIsReviewOpen(false);
      fetchRequests();
    } catch {
      // Handled
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Attendance Correction Requests
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Review student grievances, medical absence claims, and authorized register rectifications.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Student</th>
                <th className="px-6 py-3.5">Session / Subject</th>
                <th className="px-6 py-3.5">Status Change</th>
                <th className="px-6 py-3.5">Reason Provided</th>
                <th className="px-6 py-3.5">Request Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <p className="font-semibold text-slate-800">{r.student_name || 'Student'}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.roll_number}</p>
                  </td>
                  <td className="px-6 py-3.5 text-xs">
                    <p className="font-medium text-slate-700">{r.subject_code} - {r.subject_name}</p>
                    <p className="text-slate-400">{r.session_date}</p>
                  </td>
                  <td className="px-6 py-3.5 text-xs">
                    <span className="line-through text-rose-500 mr-1.5">{r.original_status}</span>
                    <span className="font-bold text-emerald-600">&rarr; {r.requested_status}</span>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-600 max-w-xs truncate" title={r.reason}>
                    {r.reason}
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={r.status} size="xs" />
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {r.status === 'Pending' ? (
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => openReview(r, 'Approved')}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openReview(r, 'Rejected')}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold border border-rose-200 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Reviewed by {r.reviewer_name || 'Faculty'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                    No correction requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Confirmation Modal */}
      <Modal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} title={`Confirm Request ${reviewAction}`}>
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            You are about to set this correction request status to{' '}
            <span className={`font-bold ${reviewAction === 'Approved' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {reviewAction}
            </span>.
            {reviewAction === 'Approved' && (
              <span className="block mt-1 text-slate-500">
                The student's attendance record will automatically update in the cloud database.
              </span>
            )}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reviewer Notes & Justification
            </label>
            <textarea
              rows="3"
              required
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReviewOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded-xl text-sm font-semibold ${
                reviewAction === 'Approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Confirm {reviewAction}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
