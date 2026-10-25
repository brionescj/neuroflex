import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth";
import { ComingSoon } from "@/components/ComingSoon";
import { PageLoader } from "@/components/PageLoader";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/context";
import { prefetchAdminHomeAction } from "@/features/admin/actions/students.action";
import LoginPage from "@/features/auth/pages/LoginPage";
import { getStatsCatalogAction } from "@/features/stats/actions/stats.action";
import { getProfileAction } from "@/features/profile/actions/getProfile.action";
import { requestGameAccess } from "@/features/games/services/gameAccess.warm";
import { readSessionHint } from "@/lib/restoreSession";
import AuthLayout from "@/layouts/AuthLayout";

/**
 * Solo el login (y su layout) viajan en el codigo inicial: es lo primero que se ve.
 * Cada pantalla restante se descarga cuando se necesita, asi el primer arranque no
 * baja ni ejecuta el codigo de los juegos, las estadisticas ni la administracion.
 */
const loadRegister = () => import("@/features/auth/pages/RegisterPage");
const loadDashboardLayout = () => import("@/layouts/DashboardLayout");
const loadStudentDashboard = () => import("@/features/student/pages/StudentDashboard");
const loadAdminDashboard = () => import("@/features/admin/pages/AdminDashboard");

const RegisterPage = lazy(loadRegister);
const DashboardLayout = lazy(loadDashboardLayout);
const StudentDashboard = lazy(loadStudentDashboard);
const AdminDashboard = lazy(loadAdminDashboard);
const loadProfile = () => import("@/features/profile/pages/ProfilePage");
const loadStats = () => import("@/features/stats/pages/StatsPage");
const loadStudentStats = () => import("@/features/stats/pages/StudentStatsPage");
const loadRequireGameAccess = () =>
  import("@/features/games/components/RequireGameAccess").then((m) => ({ default: m.RequireGameAccess }));
const loadColorSequence = () =>
  import("@/features/games/components/ColorSequenceGame").then((m) => ({ default: m.ColorSequenceGame }));
const loadMiniCases = () =>
  import("@/features/games/mini-cases/components/MiniCasesGame").then((m) => ({ default: m.MiniCasesGame }));
const loadNodeConnection = () =>
  import("@/features/games/node-connection/components/NodeConnectionGame").then((m) => ({
    default: m.NodeConnectionGame,
  }));

const ProfilePage = lazy(loadProfile);
const StatsPage = lazy(loadStats);
const StudentStatsPage = lazy(loadStudentStats);
const RequireGameAccess = lazy(loadRequireGameAccess);
const ColorSequenceGame = lazy(loadColorSequence);
const MiniCasesGame = lazy(loadMiniCases);
const NodeConnectionGame = lazy(loadNodeConnection);

/**
 * Si el navegador ya sabe que hay una sesion (y de que rol), la pantalla a la que lleva
 * se descarga YA, mientras el servidor confirma la sesion: la espera de /auth/me
 * (que puede ser larga si la funcion arranca en frio) deja de ser tiempo muerto.
 */
function prefetchForSession(role: "student" | "admin") {
  void loadDashboardLayout();
  void (role === "student" ? loadStudentDashboard() : loadAdminDashboard());
}

/**
 * Sin sesion, con el login ya a la vista y el navegador sin tareas, se descargan las
 * pantallas a las que lleva iniciar sesion: al entrar, ya estan y el dashboard aparece
 * sin esperar la descarga.
 */
function prefetchAfterLogin() {
  const run = () => {
    void loadDashboardLayout();
    void loadStudentDashboard();
    void loadAdminDashboard();
    void loadRegister();
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}

/**
 * Ya dentro, con el dashboard a la vista y el navegador sin tareas, se descargan en
 * segundo plano las demas pantallas de su rol: al tocarlas abren sin esperar.
 */
function prefetchRoleScreens(role: "student" | "admin") {
  const run = () => {
    void loadProfile();

    if (role === "student") {
      void loadRequireGameAccess();
      void loadColorSequence();
      void loadMiniCases();
      void loadNodeConnection();
    } else {
      void loadStats();
      void loadStudentStats();
    }
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 6000 });
  } else {
    setTimeout(run, 3000);
  }
}

const hintedRole = readSessionHint();

if (hintedRole) prefetchForSession(hintedRole);

export default function App() {
  const { user } = useAuth();

  useEffect(() => {
    if (!hintedRole) prefetchAfterLogin();
  }, []);

  const role = user?.role ?? null;

  useEffect(() => {
    if (role) prefetchRoleScreens(role);
  }, [role]);

  // Lo primero que ve cada rol se pide ya, sin esperar a que se descargue y se dibuje su pantalla; lo demas, un
  // instante despues para no competir con eso. Todo queda en memoria (se vacia al cerrar sesion) y quien abre
  // la pantalla lo recoge: Mi perfil y, en el administrador, Estadisticas y Desempeño (que comparten el catalogo).
  const userRut = user?.rut ?? null;

  useEffect(() => {
    if (!userRut || !role) return;

    if (role === "admin") prefetchAdminHomeAction();

    const timer = window.setTimeout(() => {
      void getProfileAction(userRut, role);

      if (role === "admin") void getStatsCatalogAction();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [userRut, role]);

  // Apenas se sabe quien es el estudiante se pide a que juegos tiene acceso, sin esperar
  // a que se dibuje su menu (que tomara esta misma consulta).
  const studentRut = user?.role === "student" ? user.rut : null;

  useEffect(() => {
    if (studentRut) void requestGameAccess(studentRut);
  }, [studentRut]);

  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path={ROUTES.ADMIN_STUDENT_STATS} element={<StudentStatsPage />} />
          <Route path={ROUTES.ADMIN_PROFILE} element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </Suspense>
  );
}