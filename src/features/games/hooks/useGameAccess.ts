import { useCallback, useEffect, useState } from "react";

import { loadGameAccess, type GameAccess } from "../services/gameAccess.service";

export type GameAccessStatus = "loading" | "ready" | "error";

/**
 * Consulta al servidor a que juegos con desbloqueo tiene acceso el
 * estudiante. Siempre se pregunta de nuevo (no se guarda en memoria): el
 * desbloqueo lo decide el servidor, y una respuesta guardada podria
 * mostrarsele a otro estudiante que inicie sesion en el mismo navegador.
 */
export function useGameAccess() {
  const [status, setStatus] = useState<GameAccessStatus>("loading");
  const [access, setAccess] = useState<GameAccess | null>(null);

  const reload = useCallback(() => {
    let cancelled = false;

    setStatus("loading");

    loadGameAccess().then((response) => {
      if (cancelled) return;

      if (!response.success) {
        setAccess(null);
        setStatus("error");
        return;
      }

      setAccess(response.data);
      setStatus("ready");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => reload(), [reload]);

  return { status, access, reload };
}
