import { useEffect, useState } from "react";

import { newLeaseId, onGameLeaseLost, setActiveLease } from "@/lib/gameLease";

import type { GameId } from "../gameCatalog";
import { checkGameLease, claimGameLease } from "../services/gameLease.service";

/** Cada cuanto se comprueba que este siga siendo el lugar donde se juega (ademas de al volver a la pestana). */
const CHECK_EVERY_MS = 15_000;

/**
 * Un juego se juega desde un solo lugar a la vez. Al abrirlo, esta pestana reclama el juego; si luego
 * otra pestana o dispositivo lo abre, `lost` pasa a true y el juego debe quedar en pausa (el servidor
 * tambien rechaza lo que se intente guardar desde aqui).
 */
export function useGameLease(gameId: GameId): { lost: boolean } {
  const [leaseId] = useState(newLeaseId);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    let active = true;

    // El encabezado solo se manda cuando el reclamo ya llego al servidor: antes, una escritura con un
    // identificador desconocido podria confundirse con "otro lugar".
    void claimGameLease(gameId, leaseId).then((claimed) => {
      if (active && claimed) setActiveLease(leaseId);
    });

    const stopListening = onGameLeaseLost(() => setLost(true));

    const check = () => {
      if (active && document.visibilityState === "visible") void checkGameLease(gameId, leaseId);
    };

    const timer = window.setInterval(check, CHECK_EVERY_MS);

    document.addEventListener("visibilitychange", check);

    return () => {
      active = false;
      stopListening();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      setActiveLease(null);
    };
  }, [gameId, leaseId]);

  return { lost };
}
