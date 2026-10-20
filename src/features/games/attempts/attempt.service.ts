import { isAxiosError } from "axios";

import { api } from "@/lib/axios";
import type { GameId } from "../gameCatalog";
import type { AttemptRequest, SendOutcome } from "./types";

const ATTEMPT_TIMEOUT_MS = 30_000;

/**
 * Manda un mensaje del registro de partidas. Distingue lo transitorio (sin
 * red, error del servidor, demasiadas peticiones: vale la pena reintentar)
 * de lo que el servidor rechazo por estar mal (reintentar no lo arregla).
 */
export async function postAttemptRequest(
  gameId: GameId,
  body: AttemptRequest,
): Promise<SendOutcome> {
  try {
    await api.post(`/game-attempts/${gameId}`, body, {
      timeout: ATTEMPT_TIMEOUT_MS,
    });

    return "ok";
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      const { status } = error.response;

      return status >= 500 || status === 429 ? "retry" : "rejected";
    }

    return "retry";
  }
}
