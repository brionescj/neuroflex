import { randomUUID } from "node:crypto";

import type { VercelResponse } from "@vercel/node";

import { clearSessionCookie } from "./cookies";
import type { TokenPayload } from "./jwt";
import { AuthUser } from "./models/AuthUser";

/**
 * Sesion unica del estudiante: solo el ultimo inicio de sesion vale. Al entrar desde otro
 * navegador o dispositivo se guarda un identificador nuevo en su cuenta y el token de la
 * sesion anterior (que lleva el identificador viejo) deja de ser aceptado.
 * No aplica a los administradores: pueden tener varias sesiones abiertas.
 */
export const SESSION_REPLACED_CODE = "session-replaced";

export const SESSION_REPLACED_MESSAGE =
  "Tu sesión se cerró porque iniciaste sesión en otro dispositivo o navegador.";

/** Cuanto se recuerda que un token estaba vigente: ahorra una lectura a la base en cada peticion. */
const VALID_FOR_MS = 5_000;

const knownValid = new Map<string, number>();

function cacheKey(rut: string, sid: string): string {
  return `${rut}:${sid}`;
}

/** Abre una sesion nueva para el estudiante y deja sin efecto la anterior. Devuelve su identificador. */
export async function startStudentSession(rut: string): Promise<string> {
  const sid = randomUUID();

  await AuthUser.updateOne({ rut }, { $set: { sessionId: sid } });

  // Lo que se recordaba de sesiones anteriores de esta persona ya no vale.
  for (const key of knownValid.keys()) {
    if (key.startsWith(`${rut}:`)) knownValid.delete(key);
  }

  knownValid.set(cacheKey(rut, sid), Date.now() + VALID_FOR_MS);

  return sid;
}

/**
 * El token es la sesion vigente de ese estudiante?
 * - Administradores: siempre.
 * - Token sin `sid` (emitido antes de existir este control): vale mientras la cuenta no haya
 *   abierto una sesion nueva.
 * Solo se recuerdan los "si"; un "no" siempre se vuelve a comprobar, asi una sesion recien
 * abierta nunca queda rechazada por algo que recordo otra instancia del servidor.
 */
export async function isCurrentSession(payload: TokenPayload): Promise<boolean> {
  if (payload.role !== "student") return true;

  const key = cacheKey(payload.rut, payload.sid ?? "-");
  const until = knownValid.get(key);

  if (until !== undefined && until > Date.now()) return true;

  const account = (await AuthUser.findOne({ rut: payload.rut }).select("sessionId").lean()) as
    | { sessionId?: string }
    | null;

  const stored = account?.sessionId;
  const valid = stored === undefined || stored === payload.sid;

  if (valid) {
    if (knownValid.size > 500) knownValid.clear();
    knownValid.set(key, Date.now() + VALID_FOR_MS);
  }

  return valid;
}

/**
 * Responde 401 (con un codigo que el navegador reconoce) si la sesion fue reemplazada.
 * Devuelve true si la peticion puede seguir.
 */
export async function ensureCurrentSession(
  payload: TokenPayload,
  res: VercelResponse,
): Promise<boolean> {
  if (await isCurrentSession(payload)) return true;

  clearSessionCookie(res);
  res.status(401).json({
    success: false,
    code: SESSION_REPLACED_CODE,
    message: SESSION_REPLACED_MESSAGE,
  });

  return false;
}

/** Solo para pruebas. */
export function forgetKnownSessions(): void {
  knownValid.clear();
}
