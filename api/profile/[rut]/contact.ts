import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../../lib/db";
import { verifyToken } from "../../../lib/jwt";
import { readSessionCookie } from "../../../lib/cookies";
import { isValidEmail } from "../../../lib/email";
import { Student } from "../../../lib/models/Student";
import { Teacher } from "../../../lib/models/Teacher";
import { Admin } from "../../../lib/models/Admin";

function modelFor(role: string) {
  if (role === "student") return Student;
  if (role === "teacher") return Teacher;
  return Admin;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const token = readSessionCookie(req.headers.cookie);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return res.status(401).json({ success: false, message: "No autenticado." });
  }

  const rut = req.query.rut as string;

  if (payload.rut !== rut) {
    return res.status(403).json({ success: false, message: "No autorizado." });
  }

  const { email, avatarId } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Correo invalido." });
  }

  await connectDB();

  const Model = modelFor(payload.role);

  const updated = await Model.findOneAndUpdate(
    { rut },
    { email, avatarId },
    { new: true },
  );

  if (!updated) {
    return res.status(404).json({ success: false, message: "No se pudo actualizar el perfil." });
  }

  return res.status(200).json({
    success: true,
    message: "Perfil actualizado.",
    data: { email: updated.email, avatarId: updated.avatarId },
  });
}