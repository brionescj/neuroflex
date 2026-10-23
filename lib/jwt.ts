import jwt from "jsonwebtoken";

import { getRequiredEnv } from "./env";

const SECRET = getRequiredEnv("JWT_SECRET");

/** Los roles que existen. El de docente se elimino: una sesion suya ya no vale. */
export const ROLES = ["student", "admin"] as const;

export type TokenPayload = {
  id: string;
  rut: string;
  role: (typeof ROLES)[number];
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, SECRET) as unknown as TokenPayload;

    return (ROLES as readonly string[]).includes(payload.role) ? payload : null;
  } catch {
    return null;
  }
}