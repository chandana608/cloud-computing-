import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Edit2,
  UserX,
  UserCheck,
  Eye,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    roll_number: '',
    class_id: '',
    department: 'Computer Science & Engineering',
    semester: 5,
    password: 'Student@123'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedClass) params.class_id = selectedClass;

      const [stuRes, clsRes] = await Promise.all([
        api.get('/students', { params }),
        api.get('/classes')
      ]);

      if (stuRes.success) setStudents(stuRes.data);
      if (clsRes.success) setClasses(clsRes.data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/students', formData);
      toast.success('Student account created and enrolled successfully!');
      setIsAddOpen(false);
      setFormData({
        full_name: '',
        email: '',
        roll_number: '',
        class_id: '',
        department: 'Computer Science & Engineering',
        semester: 5,
        password: 'Student@123'
      });
      fetchData();
    } catch {
      // Handled
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/students/${selectedStudent.id}`, formData);
      toast.success('Student details updated.');
      setIsEditOpen(false);
      fetchData();
    } catch {
      // Handled
    }
  };

  const handleToggleStatus = async (student) => {
    try {
      const newStatus = !student.is_active;
      await api.patch(`/students/${student.id}/status`, { is_active: newStatus });
      toast.success(`Account ${newStatus ? 'activated' : 'deactivated'}.`);
      fetchData();
    } catch {
      // Handled
    }
  };

  const openEdit = (stu) => {
    setSelectedStudent(stu);
    setFormData({
      full_name: stu.full_name || '',
      email: stu.email || '',
      roll_number: stu.roll_number || '',
      class_id: stu.class_id || '',
      department: stu.department || '',
      semester: stu.semester || 5
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Student Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Maintain institutional student registry, enrollments, and active portal credentials.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by roll number, name or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all w-full md:w-auto"
          >
            <option value="">All Academic Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.section})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Roll Number</th>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-6 py-3.5">Email / ID</th>
                <th className="px-6 py-3.5">Class & Section</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((stu) => (
                <tr key={stu.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-800">
                    {stu.roll_number}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-800">
                    {stu.full_name}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-500">
                    {stu.email}
                  </td>
                  <td className="px-6 py-3.5 text-xs">
                    {stu.class_name ? `${stu.class_name} (${stu.section})` : 'Unassigned'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        stu.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {stu.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => openEdit(stu)}
                      title="Edit Student"
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(stu)}
                      title={stu.is_active ? 'Deactivate Account' : 'Activate Account'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        stu.is_active
                          ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {stu.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register New Student">
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
              placeholder="e.g. Aarav Sharma"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Roll Number *
              </label>
              <input
                type="text"
                required
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                placeholder="23CS001"
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
                placeholder="23cs001@college.edu"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Class & Section *
            </label>
            <select
              required
              value={formData.class_id}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.section}) - Sem {cls.semester}
                </option>
              ))}
            </select>
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
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Initial Password
            </label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-500"
            />
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
              Save Student
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Student Details">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Roll Number
              </label>
              <input
                type="text"
                required
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Class & Section
            </label>
            <select
              value={formData.class_id}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.section})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
            >
              Update Student
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
