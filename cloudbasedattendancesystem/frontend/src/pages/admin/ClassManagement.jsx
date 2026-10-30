import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/Modal';
import { Building2, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: 'B.Tech Computer Science & Engineering',
    section: 'C',
    academic_year: '2026-2027',
    semester: 5,
    department: 'Computer Science & Engineering'
  });

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classes');
      if (res.success) setClasses(res.data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/classes', formData);
      toast.success('Class and section created successfully!');
      setIsAddOpen(false);
      fetchClasses();
    } catch {
      // Handled
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Academic Classes & Sections
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Organize student cohorts, departments, academic years, and sections.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create Class</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((c) => (
          <div
            key={c.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
                  {c.section}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                  Sem {c.semester}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base mt-3">
                {c.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{c.department}</p>
              <p className="text-xs text-slate-400 mt-2">Academic Year: {c.academic_year}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Users className="w-4 h-4 text-slate-400" />
                {c.student_count || 0} Students Enrolled
              </span>
              <span className="text-brand-600 font-medium">Active Cohort</span>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Class & Section">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Class / Degree Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Section *
              </label>
              <input
                type="text"
                required
                maxLength="2"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                placeholder="A, B, C"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Semester *
              </label>
              <input
                type="number"
                min="1"
                max="8"
                required
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Academic Year *
              </label>
              <input
                type="text"
                required
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
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
              Save Class
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
