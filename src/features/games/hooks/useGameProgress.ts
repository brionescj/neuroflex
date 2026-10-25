import { useCallback, useEffect, useState } from "react";

import type { GameId } from "../gameCatalog";
import {
  clearGameProgress,
  forgetPrefetchedProgress,
  loadGameProgress,
  saveGameProgress,
} from "../services/gameProgress.service";
import { getProgressQueue } from "@/features/games/services/progressQueue";

export type GameProgressStatus = "loading" | "ready" | "error";

/**
 * Carga una sola vez el progreso guardado de este juego y expone como
 * guardarlo/borrarlo. `saved` es lo que habia en el servidor al cargar la
 * pagina (no se actualiza con cada save): sirve para decidir si hay algo
 * que reanudar, no como estado vivo de la partida.
 *
 * `saved` llega como `unknown` a proposito: es un blob escrito por el
 * cliente y puede estar vacio, viejo o corrupto. Cada juego lo valida con
 * su propio parser antes de usarlo.
 */
export function useGameProgress(gameId: GameId) {
  const [status, setStatus] = useState<GameProgressStatus>("loading");
  const [saved, setSaved] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setStatus("loading");
    setError(null);

    loadGameProgress(gameId).then((response) => {
      if (!response.success) {
        setError(response.message);
        setStatus("error");
        return;
      }

      setSaved(response.data ?? null);
      setStatus("ready");
    });
  }, [gameId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Guardar y borrar pasan por una cola por juego: el servidor se queda con
  // la ultima escritura que LLEGA, asi que si salieran en paralelo un
  // guardado viejo podria pisar a uno nuevo (ver progressQueue.ts).
  const save = useCallback(
    (state: unknown) => {
      // Lo pedido por adelantado ya no es el avance actual (y no debe recogerse al reabrir el juego).
      forgetPrefetchedProgress(gameId);
      getProgressQueue(gameId).enqueue("save", async () => {
        const response = await saveGameProgress(gameId, state);

        if (!response.success && import.meta.env.DEV) {
          console.warn(
            `[useGameProgress] No se pudo guardar (${gameId}): ${response.message}`,
          );
        }
      });
    },
    [gameId],
  );

  const clear = useCallback(() => {
    setSaved(null);
    forgetPrefetchedProgress(gameId);
    getProgressQueue(gameId).enqueue("clear", () => clearGameProgress(gameId));
  }, [gameId]);

  return { status, error, saved, reload, save, clear };
}
