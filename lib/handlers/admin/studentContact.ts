import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth.js";
import { connectDB } from "../../db.js";
import { Student } from "../../models/Student.js";

/**
 * Marca si un administrador ya contacto a un estudiante para pedirle que complete su perfil
 * («Falta contactar» / «Contactado»). Guarda quien y cuando lo marco; al volver a «Falta contactar» se borra.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  const contacted = (req.body ?? {}).contacted;

  if (typeof contacted !== "boolean") {
    return res.status(400).json({ success: false, message: "El campo 'contacted' debe ser true o false." });
  }

  await connectDB();

  const update = contacted
    ? { $set: { contacted: true, contactedAt: new Date(), contactedBy: payload.rut } }
    : { $set: { contacted: false }, $unset: { contactedAt: "", contactedBy: "" } };

  const updated = await Student.findOneAndUpdate(
    { rut: req.query.rut as string, isDeleted: { $ne: true } },
    update,
    { new: true },
  );

  if (!updated) {
    return res.status(404).json({ success: false, message: "Estudiante no encontrado." });
  }

  return res.status(200).json({
    success: true,
    message: contacted ? "Marcado como contactado." : "Marcado como falta contactar.",
    data: updated,
  });
}
