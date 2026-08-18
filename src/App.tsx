import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth";
import { ROUTES } from "@/config/routes";
import { LoginPage, RegisterPage } from "@/features/auth";
import AuthLayout from "@/layouts/AuthLayout";

import AdminDashboard from "@/features/admin/pages/AdminDashboard";
import StudentDashboard from "@/features/student/pages/StudentDashboard";
import TeacherDashboard from "@/features/teacher/pages/TeacherDashboard";

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <PublicOnlyRoute>
            <AuthLayout />
          </PublicOnlyRoute>
        }
      >
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />

        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      </Route>

      <Route
        path={ROUTES.STUDENT}
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.TEACHER}
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN}
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}