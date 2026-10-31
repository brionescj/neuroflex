import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db.js";
import { requireAuth } from "../../auth.js";
import { Student } from "../../models/Student.js";
import { parseStudentDetails } from "../../studentFields.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  const rut = req.query.rut as string;

  // La comuna debe ser de la region: si el cambio toca a una de las dos, se compara con lo ya guardado.
  // Cualquier otro dato se valida antes de abrir la conexion.
  const body = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<string, unknown>;
  const touchesPlace = body.region !== undefined || body.comuna !== undefined;

  let parsed = touchesPlace ? null : parseStudentDetails(req.body);

  if (parsed && !parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.message });
  }

  await connectDB();

  if (!parsed) {
    const stored = await Student.findOne({ rut, isDeleted: { $ne: true } }).select("region comuna").lean();

    parsed = parseStudentDetails(req.body, { current: stored ?? undefined });
  }

  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.message });
  }

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
