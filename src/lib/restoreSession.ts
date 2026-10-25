import type { SessionUser, UserRole } from "@/types";

import { api } from "./axios";

const HINT_COOKIE = "neuroflex_hint";

type EarlyResponse = { status: number; body: { data?: SessionUser } | null } | null;

declare global {
  interface Window {
    /** La peticion de /auth/me que index.html adelanta mientras se descarga el codigo. */
    __earlyMe?: Promise<EarlyResponse>;
  }
}

/**
 * El servidor deja una cookie auxiliar (el rol, nada mas) cuando hay una sesion
 * abierta. Con ella el navegador sabe si debe esperar la respuesta de /auth/me o puede
 * mostrar el login de inmediato, y que pantalla conviene ir descargando.
 * No es una credencial: quien la inventa solo ve una carga hasta que /auth/me dice 401.
 */
export function readSessionHint(): UserRole | null {
  try {
    const entry = document.cookie.split(";").find((c) => c.trim().startsWith(`${HINT_COOKIE}=`));
    const value = entry?.split("=")[1]?.trim();

    return value === "student" || value === "admin" ? value : null;
  } catch {
    return null;
  }
}

export function hasSessionHint(): boolean {
  return readSessionHint() !== null;
}

function clearSessionHint() {
  try {
    document.cookie = `${HINT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch {
    // Sin acceso a las cookies no hay nada que limpiar.
  }
}

function setSessionHint(role: UserRole) {
  try {
    document.cookie = `${HINT_COOKIE}=${role}; Max-Age=${60 * 60 * 24 * 7}; Path=/; SameSite=Lax`;
  } catch {
    // Sin acceso a las cookies solo se pierde la mejora de velocidad.
  }
}

async function askServer(): Promise<SessionUser | null> {
  try {
    const response = await api.get("/auth/me");

    return response.data.data ?? null;
  } catch {
    return null;
  }
}

let pending: Promise<SessionUser | null> | null = null;

/**
 * Pregunta al servidor quien tiene la sesion abierta. Si index.html ya adelanto la
 * peticion, usa esa respuesta (asi la espera del servidor se solapa con la descarga
 * del codigo). Se comparte la misma promesa entre llamadas: React en desarrollo
 * monta dos veces y no debe disparar dos peticiones.
 */
export function restoreSession(): Promise<SessionUser | null> {
  if (pending) return pending;

  const early = window.__earlyMe;
  delete window.__earlyMe;

  const user = early
    ? early.then((response) => {
        // Sin respuesta (fallo de red): se vuelve a preguntar por el camino normal.
        if (!response) return askServer();

        return response.status === 200 ? (response.body?.data ?? null) : null;
      })
    : askServer();

  pending = user.then((result) => {
    // Una sesion abierta antes de existir la cookie auxiliar la recibe aqui.
    if (result) setSessionHint(result.role);
    else clearSessionHint();

    return result;
  });

  return pending;
}
