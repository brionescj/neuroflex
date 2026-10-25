import { sharedRequest } from "@/lib/sharedRequest";
import type { ApiResponse } from "@/types";

import { loadGameAccess, type GameAccess } from "./gameAccess.service";

/** Cuanto se reutiliza una consulta reciente (o en vuelo) en vez de lanzar otra. */
export const REUSE_MS = 5000;

/**
 * Pide a que juegos con desbloqueo tiene acceso el estudiante `rut`.
 *
 * Se puede pedir en cuanto se sabe quien es (antes de dibujar el menu): el menu, al montarse unos
 * instantes despues, toma esa misma respuesta en vez de lanzar otra. Pasados `reuseMs` siempre se
 * consulta de nuevo: el desbloqueo lo decide el servidor. Con `reuseMs = 0` (un reintento) nunca se
 * reutiliza. Una respuesta con error no se reutiliza.
 */
export function requestGameAccess(rut: string, reuseMs: number = REUSE_MS): Promise<ApiResponse<GameAccess>> {
  return sharedRequest(`games:access:${rut}`, loadGameAccess, reuseMs);
}
