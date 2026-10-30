import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";
import { verifyToken } from "../../jwt";
import { ensureCurrentSession } from "../../sessions";
import { readSessionCookie } from "../../cookies";
import { emailProblem, normalizeEmail } from "../../email";
import { Student } from "../../models/Student";
import { Admin } from "../../models/Admin";
import { parseStudentDetails } from "../../studentFields";

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

  const { email: rawEmail, avatarId, birthDate, studyShift, region, comuna, gender } = req.body ?? {};

  const email = typeof rawEmail === "string" ? normalizeEmail(rawEmail) : "";
  const problem = emailProblem(email);

  if (problem) {
    return res.status(400).json({ success: false, message: problem });
  }

  // La fecha de nacimiento, la jornada, la region, la comuna y el genero son del estudiante: se validan con las
  // mismas reglas que usa el panel de administracion (edad de 17 a 80 anos; la comuna de la region).
  // Vacio las borra; ausente no las toca. Un administrador no las tiene.
  const extras: { set: Record<string, string>; unset: Record<string, 1> } = { set: {}, unset: {} };
  const wantsExtras = [birthDate, studyShift, region, comuna, gender].some((value) => value !== undefined);

  if (wantsExtras && payload.role !== "student") {
    return res.status(400).json({ success: false, message: "Ese dato no corresponde a este perfil." });
  }

  await connectDB();

  if (!(await ensureCurrentSession(payload, res))) return;

  if (wantsExtras) {
    // La comuna debe ser de la region: si el cambio toca a una de las dos, se compara con lo ya guardado.
    const stored =
      region !== undefined || comuna !== undefined
        ? await Student.findOne({ rut }).select("region comuna").lean()
        : null;

    const parsed = parseStudentDetails(
      { birthDate, studyShift, region, comuna, gender },
      { requireChanges: false, current: stored ?? undefined },
    );

    if (!parsed.ok) {
      return res.status(400).json({ success: false, message: parsed.message });
    }

    extras.set = parsed.set;
    extras.unset = parsed.unset as Record<string, 1>;
  }

  const Model = modelFor(payload.role);

  if (!Model) {
    return res.status(403).json({ success: false, message: "No autorizado." });
  }

  // Mongo rechaza un $unset vacio: solo se manda cuando hay algo que borrar.
  const update = {
    email,
    avatarId,
    ...extras.set,
    ...(Object.keys(extras.unset).length > 0 && { $unset: extras.unset }),
  };

  const updated = await Model.findOneAndUpdate({ rut }, update, { new: true });

  if (!updated) {
    return res.status(404).json({ success: false, message: "No se pudo actualizar el perfil." });
  }

  return res.status(200).json({
    success: true,
    message: "Perfil actualizado.",
    data: {
      email: updated.email,
      avatarId: updated.avatarId,
      ...(payload.role === "student" && {
        birthDate: updated.birthDate,
        studyShift: updated.studyShift,
        region: updated.region,
        comuna: updated.comuna,
        gender: updated.gender,
      }),
    },
  });
}