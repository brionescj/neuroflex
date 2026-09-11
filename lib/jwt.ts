import jwt from "jsonwebtoken";

import { getRequiredEnv } from "./env";

const SECRET = getRequiredEnv("JWT_SECRET");

export type TokenPayload = {
  id: string;
  rut: string;
  role: "student" | "teacher" | "admin";
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as unknown as TokenPayload;
  } catch {
    return null;
  }
}