import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";
import { requireAuth } from "../../auth";
import { hashPassword, validatePasswordStrength, verifyPassword } from "../../password";
import { AuthUser } from "../../models/AuthUser";

/**
 * Cambio de contrasena de quien tiene la sesion iniciada (estudiante o admin).
 * Pide la contrasena actual: asi una sesion abierta y desatendida no basta para
 * quedarse con la cuenta.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["student", "admin"]);
  if (!payload) return;

  const { currentPassword, newPassword } = req.body ?? {};

  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || currentPassword === "") {
    return res.status(400).json({
      success: false,
      message: "Ingrese su contraseña actual y la nueva.",
    });
  }

  await connectDB();

  const account = await AuthUser.findOne({ rut: payload.rut });

  if (!account || !(await verifyPassword(currentPassword, account.password))) {
    return res.status(403).json({ success: false, message: "La contraseña actual no es correcta." });
  }

  const problem = validatePasswordStrength(newPassword);

  if (problem) {
    return res.status(400).json({ success: false, message: problem });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({
      success: false,
      message: "La nueva contraseña debe ser distinta de la actual.",
    });
  }

  await AuthUser.updateOne({ rut: payload.rut }, { password: await hashPassword(newPassword) });

  return res.status(200).json({ success: true, message: "Contraseña actualizada." });
}
