import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Clock, Calendar, Building2, BookOpen, MapPin, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const CreateSession = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    session_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '11:00',
    session_type: 'Lecture',
    room: 'Room-301'
  });

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const res = await api.get('/faculty/me/classes');
        if (res.success) {
          setAssignments(res.data);
          // Set initial defaults
          if (res.data.classes?.length > 0) {
            setFormData((prev) => ({ ...prev, class_id: res.data.classes[0].id }));
          }
          if (res.data.subjects?.length > 0) {
            setFormData((prev) => ({ ...prev, subject_id: res.data.subjects[0].id }));
          }
        }
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id || !formData.subject_id) {
      toast.error('Please select both a class and subject.');
      return;
    }

    try {
      const res = await api.post('/attendance/sessions', formData);
      toast.success('Attendance session opened! Ready for roll call.');
      navigate(`/faculty/sessions/${res.data.id}/mark`);
    } catch {
      // Error handled by interceptor toast
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Create Attendance Session
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Open a new digital register session for an assigned class and subject.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Class & Section *</span>
              </label>
              <select
                required
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {assignments?.classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.section}) - {c.student_count || 0} Students
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Teaching Subject *</span>
              </label>
              <select
                required
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {assignments?.subjects?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_code} - {s.subject_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Session Date *</span>
              </label>
              <input
                type="date"
                required
                value={formData.session_date}
                onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Start Time *</span>
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>End Time *</span>
              </label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Session Type
              </label>
              <select
                value={formData.session_type}
                onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="Lecture">Lecture</option>
                <option value="Lab">Laboratory / Practical</option>
                <option value="Tutorial">Tutorial</option>
                <option value="Seminar">Seminar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Classroom / Lab Location</span>
              </label>
              <input
                type="text"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="Room-301 or Cloud Lab 4"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm transition-all"
            >
              <span>Open Session & Take Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
