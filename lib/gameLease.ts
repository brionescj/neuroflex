import type { VercelRequest, VercelResponse } from "@vercel/node";

import { GameLease } from "./models/GameLease";

/**
 * Un juego se juega desde UN solo lugar a la vez: quien lo abre en ultimo lugar "tiene" el juego,
 * y cualquier otra pestana o dispositivo que siga escribiendo recibe 409 y debe volver al inicio.
 * Cada pestana genera un identificador propio al abrir el juego y lo manda en el encabezado
 * `X-Game-Lease` junto con lo que guarda.
 */
export const GAME_LEASE_HEADER = "x-game-lease";

export const GAME_LEASE_LOST_CODE = "game-opened-elsewhere";

export const GAME_LEASE_LOST_MESSAGE =
  "Este juego se abrió en otra pestaña o dispositivo, así que aquí quedó en pausa.";

const LEASE_ID = /^[A-Za-z0-9-]{8,64}$/;

export function isLeaseId(value: unknown): value is string {
  return typeof value === "string" && LEASE_ID.test(value);
}

/** Este es ahora el lugar donde se juega. */
export async function claimGame(rut: string, gameId: string, leaseId: string): Promise<void> {
  await GameLease.findOneAndUpdate(
    { studentRut: rut, gameId },
    { studentRut: rut, gameId, leaseId },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

/** El identificador sigue siendo el de quien tiene el juego? (Sin registro, nadie lo reclamo: si.) */
export async function holdsGame(rut: string, gameId: string, leaseId: string): Promise<boolean> {
  const current = (await GameLease.findOne({ studentRut: rut, gameId }).select("leaseId").lean()) as
    | { leaseId: string }
    | null;

  return current === null || current.leaseId === leaseId;
}

/**
 * Para las peticiones que GUARDAN algo del juego. Si traen el encabezado y otro lugar abrio el
 * juego despues, responde 409. Sin encabezado la peticion sigue (clientes anteriores a este control).
 * Devuelve true si puede seguir.
 */
export async function ensureGameHeld(
  req: VercelRequest,
  res: VercelResponse,
  rut: string,
  gameId: string,
): Promise<boolean> {
  const header = req.headers[GAME_LEASE_HEADER];
  const leaseId = Array.isArray(header) ? header[0] : header;

  if (leaseId === undefined) return true;

  if (isLeaseId(leaseId) && (await holdsGame(rut, gameId, leaseId))) return true;

  res.status(409).json({
    success: false,
    code: GAME_LEASE_LOST_CODE,
    message: GAME_LEASE_LOST_MESSAGE,
  });

  return false;
}
