import type { VercelResponse } from "@vercel/node";

const COOKIE_NAME = "neuroflex_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias, igual al expiresIn del JWT

export function setSessionCookie(res: VercelResponse, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`,
  );
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
  );
}

export function readSessionCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  return match ? match.split("=")[1] : null;
}