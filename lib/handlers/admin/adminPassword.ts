import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";
import { requireAuth } from "../../auth";
import { confirmAdminPassword } from "../../adminConfirm";
import { generatePassword, hashPassword } from "../../password";
import { Admin } from "../../models/Admin";
import { AuthUser } from "../../models/AuthUser";

/**
 * Un administrador genera una contraseña nueva para otro que la olvido, para que
 * puedan reestablecerse entre ellos. Pide la contraseña de quien la genera, la
 * guarda cifrada y la entrega una sola vez en la respuesta. Para la propia
 * cuenta no sirve: cada quien cambia la suya desde su perfil (auth/password).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  const rut = req.query.rut as string;

  if (rut === payload.rut) {
    return res.status(400).json({
      success: false,
      message: "Para cambiar su propia contraseña use su perfil.",
    });
  }

  await connectDB();

  const confirmation = await confirmAdminPassword(payload.rut, req.body?.adminPassword);

  if (!confirmation.ok) {
    return res.status(confirmation.status).json({ success: false, message: confirmation.message });
  }

  const admin = await Admin.findOne({ rut });

  if (!admin) {
    return res.status(404).json({ success: false, message: "Administrador no encontrado." });
  }

  const account = await AuthUser.findOne({ rut });

  if (account && account.role !== "admin") {
    return res.status(409).json({ success: false, message: "Ese RUT pertenece a otra cuenta." });
  }

  const password = generatePassword();
  const hashed = await hashPassword(password);

  if (account) {
    await AuthUser.updateOne({ rut }, { password: hashed });
  } else {
    await AuthUser.create({ rut, password: hashed, role: "admin", enabled: admin.enabled });
  }

  return res.status(200).json({
    success: true,
    message: "Contraseña nueva generada.",
    data: { password },
  });
}
