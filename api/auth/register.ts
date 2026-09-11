import type { VercelRequest, VercelResponse } from "@vercel/node";
import { normalizeForDatabase } from "../../lib/rut";

import { connectDB } from "../../lib/db";
import { hashPassword, validatePasswordStrength } from "../../lib/password";
import { AuthUser } from "../../lib/models/AuthUser";
import { Student } from "../../lib/models/Student";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  await connectDB();

  const { password } = req.body;
  const rut = normalizeForDatabase(req.body.rut);

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }

  const student = await Student.findOne({ rut, isDeleted: { $ne: true } });

  if (!student) {
    return res.status(404).json({
      success: false,
      message:
        "Este RUT no corresponde a un estudiante habilitado para registro.",
    });
  }

  if (!student.enabled) {
    return res.status(403).json({
      success: false,
      message: "Su matricula no se encuentra activa.",
    });
  }

  const existingAccount = await AuthUser.findOne({ rut });

  if (student.registered || existingAccount) {
    return res.status(409).json({
      success: false,
      message: "Este RUT ya posee una cuenta. Inicie sesion.",
    });
  }

  const hashed = await hashPassword(password);

  await AuthUser.create({ rut, password: hashed, role: "student" });
  student.registered = true;
  await student.save();

  return res.status(201).json({ success: true, message: "Cuenta creada correctamente." });
}