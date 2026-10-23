import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth";
import { ComingSoon } from "@/components/ComingSoon";
import { ROUTES } from "@/config/routes";
import { LoginPage, RegisterPage } from "@/features/auth";
import ProfilePage from "@/features/profile/pages/ProfilePage";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";

import AdminDashboard from "@/features/admin/pages/AdminDashboard";
import { ColorSequenceGame } from "@/features/games/components/ColorSequenceGame";
import { RequireGameAccess } from "@/features/games/components/RequireGameAccess";
import { MiniCasesGame } from "@/features/games/mini-cases/components/MiniCasesGame";
import { NodeConnectionGame } from "@/features/games/node-connection/components/NodeConnectionGame";
import StatsPage from "@/features/stats/pages/StatsPage";
import StudentDashboard from "@/features/student/pages/StudentDashboard";

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
        <Route
          path={ROUTES.STUDENT_GAME_COLOR_SEQUENCE}
          element={<ColorSequenceGame />}
        />
        <Route
          path={ROUTES.STUDENT_GAME_MINI_CASES}
          element={
            <RequireGameAccess unlockKey="miniCases">
              <MiniCasesGame />
            </RequireGameAccess>
          }
        />
        <Route
          path={ROUTES.STUDENT_GAME_NODE_CONNECTION}
          element={<NodeConnectionGame />}
        />
        <Route path={ROUTES.STUDENT_SCORES} element={<ComingSoon />} />
        <Route path={ROUTES.STUDENT_PROFILE} element={<ProfilePage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute roles={["admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.ADMIN} element={<AdminDashboard />} />
        <Route path={ROUTES.ADMIN_STATS} element={<StatsPage />} />
        <Route path={ROUTES.ADMIN_PROFILE} element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}