import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/axios";
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
   * Ya no se lee localStorage: el navegador manda la cookie httpOnly
   * solo, y el servidor confirma la identidad via /auth/me. isLoading
   * evita que ProtectedRoute redirija al login antes de tener respuesta.
   */
  useEffect(() => {
    let active = true;

    api
      .get("/auth/me")
      .then((response) => {
        if (active) setUser(response.data.data);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback((sessionUser: SessionUser) => {
    setUser(sessionUser);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});

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
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}