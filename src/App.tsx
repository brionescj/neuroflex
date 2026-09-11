import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth";
import { ComingSoon } from "@/components/ComingSoon";
import { ROUTES } from "@/config/routes";
import { LoginPage, RegisterPage } from "@/features/auth";
import ProfilePage from "@/features/profile/pages/ProfilePage";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";

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
        element={
          <ProtectedRoute roles={["student"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.STUDENT} element={<StudentDashboard />} />
        <Route path={ROUTES.STUDENT_SCORES} element={<ComingSoon />} />
        <Route path={ROUTES.STUDENT_PROFILE} element={<ProfilePage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute roles={["teacher"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.TEACHER} element={<TeacherDashboard />} />
        <Route path={ROUTES.TEACHER_STUDENTS} element={<ComingSoon />} />
        <Route path={ROUTES.TEACHER_REPORTS} element={<ComingSoon />} />
        <Route path={ROUTES.TEACHER_PROFILE} element={<ProfilePage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute roles={["admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.ADMIN} element={<AdminDashboard />} />
        <Route path={ROUTES.ADMIN_STUDENTS} element={<ComingSoon />} />
        <Route path={ROUTES.ADMIN_PROFILE} element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}