import { api } from "@/lib/axios";

import type { GameId } from "../gameCatalog";

/** "Este es el lugar donde se juega ahora": las demas pestanas o dispositivos con el juego abierto quedan en pausa. */
export async function claimGameLease(gameId: GameId, leaseId: string): Promise<boolean> {
  try {
    await api.post("/games/lease", { gameId, leaseId });

    return true;
  } catch {
    return false;
  }
}

/** Sigue siendo este el lugar donde se juega? Si no, el interceptor de axios avisa (409). */
export async function checkGameLease(gameId: GameId, leaseId: string): Promise<void> {
  try {
    await api.get("/games/lease", { params: { gameId, leaseId } });
  } catch {
    // Un fallo de red no es "se abrio en otro lugar": el 409 lo trata el interceptor.
  }
}
