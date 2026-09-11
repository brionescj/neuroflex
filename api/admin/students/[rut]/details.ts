import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../../../lib/db";
import { requireAuth } from "../../../../lib/auth";
import { Student } from "../../../../lib/models/Student";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  const { ciudad, region, celular } = req.body;

  await connectDB();

  const rut = req.query.rut as string;

  const updated = await Student.findOneAndUpdate(
    { rut, isDeleted: { $ne: true } },
    { ciudad, region, celular },
    { new: true },
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