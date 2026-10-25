import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context";
import { grantedFor, rememberGranted } from "@/lib/gameAccessMemory";

import type { GameAccess } from "../services/gameAccess.service";
import { REUSE_MS, requestGameAccess } from "../services/gameAccess.warm";

export type GameAccessStatus = "loading" | "ready" | "error";

/**
 * Consulta al servidor a que juegos con desbloqueo tiene acceso el estudiante.
 * Siempre se vuelve a preguntar (el desbloqueo lo decide el servidor, que ademas
 * lo exige al abrir el juego); lo recordado solo adelanta la pantalla.
 *
 * `fresh` indica que `access` ya viene del servidor en esta visita. Mientras
 * sea falso, un juego recordado como desbloqueado ya puede mostrarse, pero un
 * "no" todavia no es definitivo.
 */
export function useGameAccess() {
  const { user } = useAuth();
  const rut = user?.rut ?? null;

  const [status, setStatus] = useState<GameAccessStatus>("loading");
  const [access, setAccess] = useState<Partial<GameAccess> | null>(
    () => grantedFor(rut),
  );
  const [fresh, setFresh] = useState(false);

  const start = useCallback((reuseMs: number) => {
    let cancelled = false;

    setStatus("loading");
    setFresh(false);

    requestGameAccess(rut ?? "", reuseMs).then((response) => {
      if (cancelled) return;

      if (!response.success) {
        setStatus("error");
        return;
      }

      if (rut) rememberGranted(rut, response.data);

      setAccess(response.data);
      setFresh(true);
      setStatus("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [rut]);

  // Al montar se toma la consulta que App ya adelanto; "Reintentar" siempre pregunta de nuevo.
  useEffect(() => start(REUSE_MS), [start]);

  const reload = useCallback(() => {
    start(0);
  }, [start]);

  return { status, access, fresh, reload };
}
