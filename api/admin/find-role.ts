import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../lib/db";
import { requireAuth } from "../../lib/auth";
import { normalizeForDatabase } from "../../lib/rut";
import { Student } from "../../lib/models/Student";
import { Teacher } from "../../lib/models/Teacher";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  await connectDB();

  const rut = normalizeForDatabase((req.query.rut as string) ?? "");

  const student = await Student.findOne({ rut, isDeleted: { $ne: true } });

  if (student) {
    return res.status(200).json({
      success: true,
      message: "Encontrado.",
      data: { role: "student" as const },
    });
  }

  const teacher = await Teacher.findOne({ rut });

  if (teacher) {
    return res.status(200).json({
      success: true,
      message: "Encontrado.",
      data: { role: "teacher" as const },
    });
  }

  return res.status(404).json({
    success: false,
    message: "No se encontro ningun estudiante ni docente con ese RUT.",
  });
}