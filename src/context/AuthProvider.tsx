import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/axios";
import { hasSessionHint, restoreSession } from "@/lib/restoreSession";
import type { SessionUser } from "@/types";

import { AuthContext, type AuthContextValue } from "./auth.context";

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<SessionUser | null>(null);

  // Sin cookie auxiliar no hay sesion que esperar: el login se muestra de inmediato
  // y la comprobacion sigue en segundo plano (por si la sesion existe igual).
  const [isLoading, setIsLoading] = useState(hasSessionHint);

  /**
   * Rehidratacion de la sesion.
   *
   * Ya no se lee localStorage: el navegador manda la cookie httpOnly
   * solo, y el servidor confirma la identidad via /auth/me. isLoading
   * evita que ProtectedRoute redirija al login antes de tener respuesta,
   * pero solo cuando hay indicios de una sesion (ver arriba).
   */
  useEffect(() => {
    let active = true;

    restoreSession().then((restored) => {
      if (!active) return;

      // Sin sesion no se toca el usuario: si la persona ya inicio sesion mientras
      // esta comprobacion volaba, no hay que borrarla.
      if (restored) setUser(restored);
      setIsLoading(false);
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