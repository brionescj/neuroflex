import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context";

import type { GameAccess } from "../services/gameAccess.service";
import { REUSE_MS, requestGameAccess } from "../services/gameAccess.warm";

export type GameAccessStatus = "loading" | "ready" | "error";

/**
 * Lo ultimo que el servidor dijo, POR ESTUDIANTE (clave: su RUT) y solo los
 * desbloqueos concedidos. Sirve para pintar el menu y abrir un juego sin esperar
 * otra consulta, mientras se pregunta de nuevo al servidor.
 *
 * - Va por RUT, asi que otro estudiante que inicie sesion en el mismo navegador
 *   nunca ve lo del anterior.
 * - Solo se recuerda un "si": en MiniCasos el desbloqueo es definitivo (una vez
 *   registrado no se quita). Un "no" nunca se da por bueno sin consultar: podria
 *   haberse desbloqueado hace un momento.
 * - Vive en memoria: al recargar la pagina se pierde.
 */
const granted = new Map<string, Partial<GameAccess>>();

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
    () => (rut ? (granted.get(rut) ?? null) : null),
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

      if (rut) {
        const only: Partial<GameAccess> = {};
        if (response.data.miniCases) only.miniCases = true;
        granted.set(rut, only);
      }

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
