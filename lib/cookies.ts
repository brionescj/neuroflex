import type { VercelResponse } from "@vercel/node";

const COOKIE_NAME = "neuroflex_session";
/**
 * Cookie auxiliar: solo avisa al navegador que hay una sesion abierta (y de que rol,
 * para adelantar la descarga de su pantalla), asi sabe si vale la pena esperar la
 * respuesta de /auth/me antes de mostrar el login. No es una credencial (la sesion
 * real es la cookie httpOnly de arriba) ni lleva datos personales; si alguien la
 * inventa, lo unico que pasa es que ve una pantalla de carga hasta que /auth/me
 * responde 401.
 */
export const HINT_COOKIE_NAME = "neuroflex_hint";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias, igual al expiresIn del JWT

export function setSessionCookie(res: VercelResponse, token: string, role: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  res.setHeader("Set-Cookie", [
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`,
    `${HINT_COOKIE_NAME}=${role}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`,
  ]);
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader("Set-Cookie", [
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
    `${HINT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`,
  ]);
}

export function readSessionCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  return match ? match.split("=")[1] : null;
}