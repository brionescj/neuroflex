import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/axios";
import { forgetGranted, rememberGranted } from "@/lib/gameAccessMemory";
import { forgetRequests } from "@/lib/sharedRequest";
import { clearTabMemory } from "@/lib/tabMemory";
import { hasSessionHint, restoreSession } from "@/lib/restoreSession";
import type { SessionUser } from "@/types";

import { AuthContext, type AuthContextValue } from "./auth.context";

type Props = {
  children: ReactNode;
};

/**
 * Lo que el servidor adelanta al abrir la sesion (los desbloqueos ya registrados) va a la memoria de
 * desbloqueos; el usuario de la sesion queda sin ese campo.
 */
function withoutExtras(sessionUser: SessionUser): SessionUser {
  const { unlocked, ...session } = sessionUser;

  if (unlocked) rememberGranted(sessionUser.rut, unlocked);

  return session;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<SessionUser | null>(null);
  // La persona de la sesion actual, para saber si "iniciar sesion" cambia de persona o solo refresca sus datos.
  const currentRut = useRef<string | null>(null);

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
      if (restored) {
        currentRut.current = restored.rut;
        setUser(withoutExtras(restored));
      }
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback((sessionUser: SessionUser) => {
    // Otra persona: nada de lo guardado en memoria (listados, perfil, estadisticas) le corresponde.
    // La misma persona refrescando sus datos (ej. cambio de avatar) conserva lo que ya se cargo.
    if (currentRut.current !== sessionUser.rut) {
      forgetRequests();
      forgetGranted();
      clearTabMemory();
    }

    currentRut.current = sessionUser.rut;
    setUser(withoutExtras(sessionUser));
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});

    forgetRequests();
    forgetGranted();
    clearTabMemory();
    currentRut.current = null;
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