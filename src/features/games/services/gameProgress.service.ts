import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { fail, type ApiResponse } from "@/types";
import type { GameId } from "../gameCatalog";

// La cola de progreso envia de a una peticion y espera su respuesta. Si el
// servidor local es lento, el timeout global de axios (10 s) cortaria el
// cliente mientras el servidor sigue procesando, y esa escritura podria
// llegar despues de la siguiente.
const PROGRESS_TIMEOUT_MS = 30_000;

export async function loadGameProgress(
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
