import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { sessionService } from "@/services/session.service";
import type { SessionUser } from "@/types";

import { AuthContext, type AuthContextValue } from "./auth.context";

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<SessionUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  /**
   * Rehidratacion de la sesion.
   *
   * isLoading evita que ProtectedRoute redirija al login
   * antes de saber si existe sesion guardada.
   */
  useEffect(() => {
    setUser(sessionService.read());

    setIsLoading(false);
  }, []);

  const login = useCallback((sessionUser: SessionUser) => {
    sessionService.save(sessionUser);

    setUser(sessionUser);
  }, []);

  const logout = useCallback(() => {
    sessionService.clear();

    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
