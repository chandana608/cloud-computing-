import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import {
  FileBarChart,
  Download,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Calendar,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('defaulters');
  const [threshold, setThreshold] = useState(75.0);
  const [defaultersData, setDefaultersData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      if (activeTab === 'defaulters') {
        const res = await api.get(`/reports/defaulters?threshold=${threshold}`);
        if (res.success) {
          setDefaultersData(res.data.defaulters || []);
        }
      } else {
        const res = await api.get(`/reports/daily?date=${selectedDate}`);
        if (res.success) {
          setDailyData(res.data || []);
        }
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, threshold, selectedDate]);

  const handleExportCSV = () => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    const token = localStorage.getItem('token');
    const url = `${baseURL}/reports/export/csv?type=${activeTab}&threshold=${threshold}&date=${selectedDate}`;

    // Download using standard fetch with auth token
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${activeTab}_report.csv`;
        a.click();
        toast.success('CSV Export downloaded successfully.');
      })
      .catch(() => toast.error('Failed to download CSV.'));
  };

  const handleExportPDF = () => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    const token = localStorage.getItem('token');
    const url = `${baseURL}/reports/export/pdf?type=${activeTab}&threshold=${threshold}&date=${selectedDate}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${activeTab}_report.pdf`;
        a.click();
        toast.success('PDF Report downloaded successfully.');
      })
      .catch(() => toast.error('Failed to download PDF.'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Attendance Reports & Defaulters
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Generate formal academic attendance registers, defaulter analysis, and export documents.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow-sm transition-all"
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('defaulters')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'defaulters'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Defaulter Registry (&lt; {threshold}%)</span>
        </button>

        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'daily'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span>Daily Register Summary</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      {activeTab === 'defaulters' ? (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600">Threshold Policy:</span>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-36 accent-brand-600"
            />
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
              {threshold}%
            </span>
          </div>
          <span className="text-xs text-rose-600 font-medium">
            Found {defaultersData.length} students below threshold
          </span>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <span className="text-xs font-medium text-slate-600">Selected Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {activeTab === 'defaulters' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Roll Number</th>
                  <th className="px-6 py-3.5">Student Name</th>
                  <th className="px-6 py-3.5">Class</th>
                  <th className="px-6 py-3.5">Attended / Eligible</th>
                  <th className="px-6 py-3.5">Attendance %</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defaultersData.map((d) => (
                  <tr key={d.student_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-800">{d.roll_number}</td>
                    <td className="px-6 py-3.5 font-medium text-slate-800">{d.full_name}</td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">{d.class_name}</td>
                    <td className="px-6 py-3.5 text-xs">
                      {d.attended_sessions} / {d.eligible_sessions} sessions
                    </td>
                    <td className="px-6 py-3.5 font-bold text-rose-600">{d.percentage}%</td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status="Defaulter" size="xs" />
                    </td>
                  </tr>
                ))}
                {defaultersData.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                      No students are currently below the {threshold}% minimum threshold.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Time</th>
                  <th className="px-6 py-3.5">Class</th>
                  <th className="px-6 py-3.5">Subject</th>
                  <th className="px-6 py-3.5">Faculty</th>
                  <th className="px-6 py-3.5">Present / Marked</th>
                  <th className="px-6 py-3.5">Session Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyData.map((sess) => (
                  <tr key={sess.session_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-800">
                      {sess.start_time} - {sess.end_time}
                    </td>
                    <td className="px-6 py-3.5">{sess.class_name}</td>
                    <td className="px-6 py-3.5 font-medium text-brand-600">
                      {sess.subject_code} ({sess.subject_name})
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">{sess.faculty_name}</td>
                    <td className="px-6 py-3.5 text-xs font-semibold">
                      {sess.present} / {sess.total_marked}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={sess.status} size="xs" />
                    </td>
                  </tr>
                ))}
                {dailyData.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                      No sessions scheduled or conducted on this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
