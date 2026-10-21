import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";
import { requireAuth } from "../../auth";
import { Student } from "../../models/Student";
import { parseStudentDetails } from "../../studentFields";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  const parsed = parseStudentDetails(req.body);

  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.message });
  }

  await connectDB();

  const rut = req.query.rut as string;

  // Mongo rechaza un $set o $unset vacio, asi que solo se manda el que tiene datos.
  const update = {
    ...(Object.keys(parsed.set).length > 0 && { $set: parsed.set }),
    ...(Object.keys(parsed.unset).length > 0 && { $unset: parsed.unset }),
  };

  const updated = await Student.findOneAndUpdate(
    { rut, isDeleted: { $ne: true } },
    update,
    { new: true, runValidators: true },
  );

  if (!updated) {
    return res.status(404).json({ success: false, message: "Estudiante no encontrado." });
  }

  return res.status(200).json({
    success: true,
    message: "Datos actualizados.",
    data: updated,
  });
}
