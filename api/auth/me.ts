import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../lib/db";
import { verifyToken } from "../../lib/jwt";
import { readSessionCookie } from "../../lib/cookies";
import { findProfile } from "../../lib/findProfile";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const token = readSessionCookie(req.headers.cookie);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return res.status(401).json({ success: false, message: "No autenticado." });
  }

  await connectDB();

  const profile = await findProfile(payload.rut, payload.role);

  if (!profile) {
    return res.status(404).json({ success: false, message: "Ficha no encontrada." });
  }

  if (!profile.enabled) {
    return res.status(403).json({
      success: false,
      message: "Su ficha institucional no se encuentra activa.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Sesion valida.",
    data: {
      id: payload.id,
      rut: payload.rut,
      role: payload.role,
      displayName: `${profile.firstName} ${profile.paternalLastName}`,
      avatarId: profile.avatarId,
    },
  });
}