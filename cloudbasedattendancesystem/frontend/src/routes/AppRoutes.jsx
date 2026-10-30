import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../layouts/DashboardLayout';

// Auth Pages
import { Login } from '../pages/auth/Login';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { Unauthorized, NotFound } from '../pages/auth/Unauthorized';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { StudentManagement } from '../pages/admin/StudentManagement';
import { FacultyManagement } from '../pages/admin/FacultyManagement';
import { ClassManagement } from '../pages/admin/ClassManagement';
import { SubjectManagement } from '../pages/admin/SubjectManagement';
import { ReportsPage } from '../pages/admin/ReportsPage';
import { CorrectionManagement } from '../pages/admin/CorrectionManagement';
import { AuditLogsPage } from '../pages/admin/AuditLogsPage';
import { SettingsPage } from '../pages/admin/SettingsPage';

// Faculty Pages
import { FacultyDashboard } from '../pages/faculty/FacultyDashboard';
import { CreateSession } from '../pages/faculty/CreateSession';
import { MarkAttendance } from '../pages/faculty/MarkAttendance';
import { FacultySessions } from '../pages/faculty/FacultySessions';

// Student Pages
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { MyAttendance } from '../pages/student/MyAttendance';
import { SubjectAnalytics } from '../pages/student/SubjectAnalytics';
import { CorrectionHistory } from '../pages/student/CorrectionHistory';
import { StudentProfile } from '../pages/student/StudentProfile';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  const { user } = useAuth();

  const getDefaultRedirect = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'faculty') return '/faculty/dashboard';
    return '/student/dashboard';
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<StudentManagement />} />
        <Route path="faculty" element={<FacultyManagement />} />
        <Route path="classes" element={<ClassManagement />} />
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="sessions" element={<FacultySessions />} />
        <Route path="sessions/:id/mark" element={<MarkAttendance />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="corrections" element={<CorrectionManagement />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Faculty Routes */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/faculty/dashboard" replace />} />
        <Route path="dashboard" element={<FacultyDashboard />} />
        <Route path="sessions/new" element={<CreateSession />} />
        <Route path="sessions" element={<FacultySessions />} />
        <Route path="sessions/:id/mark" element={<MarkAttendance />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="corrections" element={<CorrectionManagement />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="attendance" element={<MyAttendance />} />
        <Route path="analytics" element={<SubjectAnalytics />} />
        <Route path="corrections" element={<CorrectionHistory />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* Root & Catch-all */}
      <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
