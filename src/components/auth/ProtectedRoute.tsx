import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { DASHBOARD_BY_ROLE, ROUTES } from "@/config/routes";
import { useAuth } from "@/context";
import type { UserRole } from "@/types";

type Props = {
  children: ReactNode;

  roles?: UserRole[];
};

export function ProtectedRoute({ children, roles }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  /**
   * Rol incorrecto: no se expulsa la sesion,
   * se devuelve al dashboard que si le corresponde.
   */
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={DASHBOARD_BY_ROLE[user.role]} replace />;
  }

  return <>{children}</>;
}
