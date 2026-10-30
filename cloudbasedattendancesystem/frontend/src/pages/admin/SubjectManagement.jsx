import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/Modal';
import { BookOpen, Plus, Users, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SubjectManagement = () => {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    department: 'Computer Science & Engineering',
    semester: 5,
    credits: 4,
    class_ids: [],
    faculty_ids: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, cRes, fRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/classes'),
        api.get('/faculty')
      ]);
      if (sRes.success) setSubjects(sRes.data);
      if (cRes.success) setClasses(cRes.data);
      if (fRes.success) setFaculty(fRes.data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/subjects', formData);
      toast.success('Subject created and linked to curriculum!');
      setIsAddOpen(false);
      setFormData({
        subject_code: '',
        subject_name: '',
        department: 'Computer Science & Engineering',
        semester: 5,
        credits: 4,
        class_ids: [],
        faculty_ids: []
      });
      fetchData();
    } catch {
      // Handled
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Curriculum & Subjects
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure institutional courses, assign faculty instructors, and map to classes.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map((s) => (
          <div
            key={s.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {s.subject_code}
                </span>
                <span className="text-xs text-slate-400">
                  {s.credits} Credits • Sem {s.semester}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base mt-2.5">
                {s.subject_name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{s.department}</p>

              {/* Faculty Instructors */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Faculty Instructor(s)
                </p>
                <div className="flex flex-wrap gap-1">
                  {s.faculty_list?.map((f) => (
                    <span key={f.id} className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {f.name}
                    </span>
                  ))}
                  {(!s.faculty_list || s.faculty_list.length === 0) && (
                    <span className="text-xs text-slate-400 italic">No assigned faculty</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Classes: {s.class_list?.length || 0} mapped</span>
              <span className="text-emerald-600 font-medium">Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Subject Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Academic Subject">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subject Code *
              </label>
              <input
                type="text"
                required
                value={formData.subject_code}
                onChange={(e) => setFormData({ ...formData, subject_code: e.target.value.toUpperCase() })}
                placeholder="CS501"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Credits
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={formData.subject_name}
              onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
              placeholder="e.g. Cloud Computing & Distributed Systems"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Semester
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
            >
              Save Subject
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
