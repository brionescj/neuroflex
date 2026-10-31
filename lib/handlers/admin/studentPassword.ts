import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db.js";
import { requireAuth } from "../../auth.js";
import { confirmAdminPassword } from "../../adminConfirm.js";
import { generatePassword, hashPassword } from "../../password.js";
import { AuthUser } from "../../models/AuthUser.js";
import { Student } from "../../models/Student.js";

/**
 * Genera una contrasena nueva para un estudiante y la guarda (encriptada). Pide
 * la contrasena del administrador con la sesion iniciada: es una confirmacion
 * de que quien esta frente a la pantalla es el administrador. Sirve tambien para
 * un estudiante que aun no se registro: se le crea la cuenta con esa contrasena
 * (queda registrado y ya no usa el formulario de registro). La contrasena viaja
 * en la respuesta una sola vez, para que el administrador se la entregue.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  await connectDB();

  const confirmation = await confirmAdminPassword(payload.rut, req.body?.adminPassword);

  if (!confirmation.ok) {
    return res.status(confirmation.status).json({ success: false, message: confirmation.message });
  }

  const rut = req.query.rut as string;
  const student = await Student.findOne({ rut, isDeleted: { $ne: true } });

  if (!student) {
    return res.status(404).json({ success: false, message: "Estudiante no encontrado." });
  }

  const account = await AuthUser.findOne({ rut });

  if (account && account.role !== "student") {
    return res.status(409).json({ success: false, message: "Ese RUT pertenece a otra cuenta." });
  }

  const password = generatePassword();
  const hashed = await hashPassword(password);

  if (account) {
    await AuthUser.updateOne({ rut }, { password: hashed });
  } else {
    await AuthUser.create({ rut, password: hashed, role: "student", enabled: student.enabled });
  }

  const wasRegistered = student.registered;

  if (!wasRegistered) {
    student.registered = true;
    await student.save();
  }

  return res.status(200).json({
    success: true,
    message: wasRegistered ? "Contraseña nueva generada." : "Cuenta creada con una contraseña nueva.",
    data: { password, createdAccount: !wasRegistered },
  });
}
