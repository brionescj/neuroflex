import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";
import { requireAuth } from "../../auth";
import { parseNameChanges } from "../../personName";
import { Admin } from "../../models/Admin";

/**
 * Corrige los nombres y apellidos de un administrador (tambien el propio): la
 * ley permite cambiarse el nombre y quien administra puede reflejarlo. El RUT no cambia.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  const names = parseNameChanges(req.body ?? {});

  if (!names.ok) {
    return res.status(400).json({ success: false, message: names.message });
  }

  if (Object.keys(names.set).length === 0) {
    return res.status(400).json({ success: false, message: "No hay datos para actualizar." });
  }

  await connectDB();

  const rut = req.query.rut as string;
  const updated = await Admin.findOneAndUpdate({ rut }, { $set: names.set }, { new: true, runValidators: true });

  if (!updated) {
    return res.status(404).json({ success: false, message: "Administrador no encontrado." });
  }

  return res.status(200).json({ success: true, message: "Datos actualizados.", data: updated });
}
