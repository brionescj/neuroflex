import { Routes, Route, Navigate } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth";

import LoginPage from "@/features/auth/pages/LoginPage";

import StudentDashboard from "@/features/student/pages/StudentDashboard";
import TeacherDashboard from "@/features/teacher/pages/TeacherDashboard";
import AdminDashboard from "@/features/admin/pages/AdminDashboard";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<LoginPage />}
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}