import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { forgetRequests, prefetchOnce, takePrefetched } from "@/lib/sharedRequest";
import { fail, type ApiResponse } from "@/types";
import type { GameId } from "../gameCatalog";
import { getProgressQueue } from "./progressQueue";

// La cola de progreso envia de a una peticion y espera su respuesta. Si el
// servidor local es lento, el timeout global de axios (10 s) cortaria el
// cliente mientras el servidor sigue procesando, y esa escritura podria
// llegar despues de la siguiente.
const PROGRESS_TIMEOUT_MS = 30_000;

const progressKey = (gameId: GameId) => `game-progress:${gameId}`;

/** Cuanto vale un avance pedido por adelantado: pasado este plazo se vuelve a pedir al abrir el juego. */
const PREFETCH_TTL_MS = 60_000;

/**
 * Pide por adelantado el avance de un juego (al mostrarse el menu) para que abrirlo no espere al
 * servidor. Se recoge UNA sola vez, y se descarta apenas se guarda o borra algo. No se pide si hay un
 * guardado en curso: la lectura podria traer el avance anterior y reanudar la partida en un punto viejo.
 */
export function prefetchGameProgress(gameId: GameId): void {
  if (getProgressQueue(gameId).isBusy()) return;

  prefetchOnce(progressKey(gameId), () => requestGameProgress(gameId), PREFETCH_TTL_MS);
}

/** Descarta el avance pedido por adelantado (ya no es el actual). */
export function forgetPrefetchedProgress(gameId: GameId): void {
  forgetRequests(progressKey(gameId));
}

export function loadGameProgress(gameId: GameId): Promise<ApiResponse<unknown>> {
  return takePrefetched<ApiResponse<unknown>>(progressKey(gameId)) ?? requestGameProgress(gameId);
}

async function requestGameProgress(
  gameId: GameId,
): Promise<ApiResponse<unknown>> {
  try {
    const response = await api.get<ApiResponse<unknown>>(
      `/game-progress/${gameId}`,
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<unknown>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

export async function saveGameProgress(
  gameId: GameId,
  state: unknown,
): Promise<ApiResponse<null>> {
  forgetPrefetchedProgress(gameId);

  try {
    const response = await api.put<ApiResponse<null>>(
      `/game-progress/${gameId}`,
      { state },
      { timeout: PROGRESS_TIMEOUT_MS },
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<null>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

export async function clearGameProgress(
  gameId: GameId,
): Promise<ApiResponse<null>> {
  forgetPrefetchedProgress(gameId);

  try {
    const response = await api.delete<ApiResponse<null>>(
      `/game-progress/${gameId}`,
      { timeout: PROGRESS_TIMEOUT_MS },
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<null>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}
