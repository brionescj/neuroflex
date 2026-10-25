import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";
import { verifyToken } from "../../jwt";
import { ensureCurrentSession } from "../../sessions";
import { readSessionCookie } from "../../cookies";
import { emailProblem, normalizeEmail } from "../../email";
import { Student } from "../../models/Student";
import { Admin } from "../../models/Admin";

function modelFor(role: string) {
  if (role === "student") return Student;
  if (role === "admin") return Admin;

  return null;
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

  const { email: rawEmail, avatarId } = req.body ?? {};

  const email = typeof rawEmail === "string" ? normalizeEmail(rawEmail) : "";
  const problem = emailProblem(email);

  if (problem) {
    return res.status(400).json({ success: false, message: problem });
  }

  await connectDB();

  if (!(await ensureCurrentSession(payload, res))) return;

  const Model = modelFor(payload.role);

  if (!Model) {
    return res.status(403).json({ success: false, message: "No autorizado." });
  }

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