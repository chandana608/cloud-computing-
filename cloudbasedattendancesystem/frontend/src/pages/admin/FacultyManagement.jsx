import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/Modal';
import { Users, Plus, Edit2, BookOpen, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const FacultyManagement = () => {
  const [faculty, setFaculty] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    employee_id: '',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
    assigned_subject_ids: [],
    assigned_class_ids: [],
    password: 'Faculty@123'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fRes, cRes, sRes] = await Promise.all([
        api.get('/faculty'),
        api.get('/classes'),
        api.get('/subjects')
      ]);
      if (fRes.success) setFaculty(fRes.data);
      if (cRes.success) setClasses(cRes.data);
      if (sRes.success) setSubjects(sRes.data);
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
      await api.post('/faculty', formData);
      toast.success('Faculty member registered successfully!');
      setIsAddOpen(false);
      setFormData({
        full_name: '',
        email: '',
        employee_id: '',
        department: 'Computer Science & Engineering',
        designation: 'Assistant Professor',
        assigned_subject_ids: [],
        assigned_class_ids: [],
        password: 'Faculty@123'
      });
      fetchData();
    } catch {
      // Handled
    }
  };

  const toggleSubjectSelect = (subId) => {
    setFormData((prev) => {
      const exists = prev.assigned_subject_ids.includes(subId);
      return {
        ...prev,
        assigned_subject_ids: exists
          ? prev.assigned_subject_ids.filter((id) => id !== subId)
          : [...prev.assigned_subject_ids, subId]
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Faculty Directory & Assignments
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage academic instructors, departmental allocations, and course assignments.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {faculty.map((f) => (
          <div
            key={f.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{f.full_name}</h3>
                  <p className="text-xs text-brand-600 font-medium">{f.designation}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                  {f.employee_id}
                </span>
              </div>

              <div className="mt-3 text-xs text-slate-500 space-y-1">
                <p>{f.email}</p>
                <p className="text-slate-400">{f.department}</p>
              </div>

              {/* Assigned Subjects */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Assigned Subjects ({f.assigned_subjects?.length || 0})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {f.assigned_subjects?.map((sub) => (
                    <span
                      key={sub.id}
                      className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-md text-[11px] font-medium border border-brand-100"
                    >
                      {sub.code} - {sub.name}
                    </span>
                  ))}
                  {(!f.assigned_subjects || f.assigned_subjects.length === 0) && (
                    <span className="text-xs text-slate-400 italic">No assigned subjects</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Faculty Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register Faculty Instructor">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Dr. Alan Turing"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                placeholder="FAC-CS-101"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="faculty.cs@college.edu"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
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
                Designation
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Associate Professor"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assign Subjects
            </label>
            <div className="max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-xl space-y-1">
              {subjects.map((sub) => {
                const isSelected = formData.assigned_subject_ids.includes(sub.id);
                return (
                  <div
                    key={sub.id}
                    onClick={() => toggleSubjectSelect(sub.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-brand-50 border border-brand-200 text-brand-800 font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{sub.subject_code} - {sub.subject_name}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded text-brand-600 pointer-events-none"
                    />
                  </div>
                );
              })}
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
              Save Faculty
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
