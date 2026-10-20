import { isAxiosError } from "axios";

import { api } from "@/lib/axios";
import { fail, type ApiResponse } from "@/types";

/** A que juegos con desbloqueo tiene acceso el estudiante. */
export type GameAccess = {
  miniCases: boolean;
};

export type UnlockKey = keyof GameAccess;

export async function loadGameAccess(): Promise<ApiResponse<GameAccess>> {
  try {
    const response = await api.get<ApiResponse<GameAccess>>("/games/access");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<GameAccess>;
    }
    return fail("No se pudo conectar con el servidor.");
  }
}
