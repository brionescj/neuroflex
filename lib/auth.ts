import type { VercelRequest, VercelResponse } from "@vercel/node";

import { readSessionCookie } from "./cookies";
import { verifyToken, type TokenPayload } from "./jwt";

export function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
  allowedRoles?: TokenPayload["role"][],
): TokenPayload | null {
  const token = readSessionCookie(req.headers.cookie);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    res.status(401).json({ success: false, message: "No autenticado." });
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    res.status(403).json({ success: false, message: "No autorizado." });
    return null;
  }

  return payload;
}