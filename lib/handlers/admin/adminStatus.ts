import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";
import { requireAuth } from "../../auth";
import { Admin } from "../../models/Admin";
import { AuthUser } from "../../models/AuthUser";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  const enabled = req.body?.enabled;

  if (typeof enabled !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "El campo 'enabled' debe ser true o false.",
    });
  }

  const rut = req.query.rut as string;

  // Quien inhabilita a otro sigue habilitado, asi que siempre queda al menos un
  // administrador activo. Inhabilitarse a si mismo dejaria esa garantia al azar.
  if (!enabled && rut === payload.rut) {
    return res.status(400).json({
      success: false,
      message: "No puede inhabilitar su propia cuenta.",
    });
  }

  await connectDB();

  const updated = await Admin.findOneAndUpdate({ rut }, { enabled }, { new: true });

  if (!updated) {
    return res.status(404).json({ success: false, message: "Administrador no encontrado." });
  }

  await AuthUser.updateOne({ rut, role: "admin" }, { enabled });

  return res.status(200).json({
    success: true,
    message: enabled ? "Administrador habilitado." : "Administrador inhabilitado.",
    data: updated,
  });
}
