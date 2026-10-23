import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";
import { verifyToken } from "../../jwt";
import { readSessionCookie } from "../../cookies";
import { findProfile } from "../../findProfile";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const token = readSessionCookie(req.headers.cookie);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return res.status(401).json({ success: false, message: "No autenticado." });
  }

  const rut = req.query.rut as string;

  // Cada quien solo puede leer su propia ficha. Ver la de un estudiante desde
  // el panel de administracion es otro endpoint (admin/students/:rut/details):
  // no relajar este check para eso.
  if (payload.rut !== rut) {
    return res.status(403).json({ success: false, message: "No autorizado." });
  }

  await connectDB();

  const profile = await findProfile(rut, payload.role);

  if (!profile) {
    return res.status(404).json({ success: false, message: "Ficha no encontrada." });
  }

  return res.status(200).json({
    success: true,
    message: "Ficha encontrada.",
    data: { role: payload.role, ...profile.toObject() },
  });
}