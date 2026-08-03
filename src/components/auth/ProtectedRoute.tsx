import { Navigate } from "react-router-dom";

import { useAuth } from "@/context";
import type { UserRole } from "@/types/user";

interface ProtectedRouteProps {
  children: React.ReactNode;

  roles?: UserRole[];
}

export function ProtectedRoute({
  children,
  roles,
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}