import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db.js";
import { verifyToken } from "../../jwt.js";
import { readSessionCookie } from "../../cookies.js";
import { findSessionProfile } from "../../findProfile.js";
import { findUnlockedGames } from "../../unlockedGames.js";
import { isCurrentSession, SESSION_REPLACED_CODE, SESSION_REPLACED_MESSAGE } from "../../sessions.js";
import { clearSessionCookie } from "../../cookies.js";

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

  const [profile, unlocked, current] = await Promise.all([
    findSessionProfile(payload.rut, payload.role),
    findUnlockedGames(payload.rut, payload.role),
    isCurrentSession(payload),
  ]);

  if (!current) {
    clearSessionCookie(res);

    return res.status(401).json({
      success: false,
      code: SESSION_REPLACED_CODE,
      message: SESSION_REPLACED_MESSAGE,
    });
  }

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
      ...(unlocked ? { unlocked } : {}),
    },
  });
}