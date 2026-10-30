import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  FileBarChart,
  ClipboardCheck,
  Settings,
  ShieldAlert,
  Clock,
  History,
  UserCheck,
  Building2,
  FileCheck2,
  BarChart3,
  User
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'student';

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/students', label: 'Students', icon: GraduationCap },
    { to: '/admin/faculty', label: 'Faculty', icon: Users },
    { to: '/admin/classes', label: 'Classes & Sections', icon: Building2 },
    { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/admin/sessions', label: 'Attendance Sessions', icon: CalendarCheck },
    { to: '/admin/reports', label: 'Reports & Defaulters', icon: FileBarChart },
    { to: '/admin/corrections', label: 'Correction Requests', icon: ClipboardCheck },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const facultyLinks = [
    { to: '/faculty/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/faculty/sessions/new', label: 'New Session', icon: Clock },
    { to: '/faculty/sessions', label: 'My Sessions', icon: CalendarCheck },
    { to: '/faculty/reports', label: 'Subject Reports', icon: FileBarChart },
    { to: '/faculty/corrections', label: 'Correction Review', icon: ClipboardCheck },
  ];

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/attendance', label: 'My Attendance', icon: CalendarCheck },
    { to: '/student/analytics', label: 'Subject Analytics', icon: BarChart3 },
    { to: '/student/corrections', label: 'Correction History', icon: History },
    { to: '/student/profile', label: 'My Profile', icon: User },
  ];

  const links = role === 'admin' ? adminLinks : role === 'faculty' ? facultyLinks : studentLinks;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        <div className="p-4 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase px-3">
            {role.toUpperCase()} PORTAL
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
              {user?.full_name ? user.full_name.charAt(0) : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user?.full_name || 'Academic User'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {user?.institution_id || user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
