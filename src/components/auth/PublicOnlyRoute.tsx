import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { DASHBOARD_BY_ROLE } from "@/config/routes";
import { useAuth } from "@/context";

type Props = {
  children: ReactNode;
};

/**
 * Impide ver Login o Registro con la sesion abierta.
 */
export function PublicOnlyRoute({ children }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user) {
    return <Navigate to={DASHBOARD_BY_ROLE[user.role]} replace />;
  }

  return <>{children}</>;
}
