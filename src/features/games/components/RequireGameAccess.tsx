import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { useGameAccess } from "../hooks/useGameAccess";
import type { UnlockKey } from "../services/gameAccess.service";

type RequireGameAccessProps = {
  unlockKey: UnlockKey;
  children: ReactNode;
};

/**
 * Deja entrar al juego solo si el estudiante lo tiene desbloqueado; si no,
 * lo devuelve al menu. El servidor tambien lo exige: esto evita mostrar un
 * juego que no va a poder cargar.
 */
export function RequireGameAccess({
  unlockKey,
  children,
}: RequireGameAccessProps) {
  const { status, access, reload } = useGameAccess();

  if (status === "loading") {
    return <p className="text-center text-sm text-zinc-500">Cargando...</p>;
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-rose-400">
          No se pudo verificar el acceso al juego.
        </p>
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!access?.[unlockKey]) {
    return <Navigate to={ROUTES.STUDENT} replace />;
  }

  return <>{children}</>;
}
