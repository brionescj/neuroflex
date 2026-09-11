import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isValidEmail } from "../../../lib/email";
import { connectDB } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";
import { isValidRut, normalizeForDatabase } from "../../../lib/rut";
import { Student } from "../../../lib/models/Student";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  await connectDB();

  if (req.method === "GET") {
    const students = await Student.find({ isDeleted: false }).sort({
      paternalLastName: 1,
    });

    return res.status(200).json({
      success: true,
      message: "Listado obtenido.",
      data: students,
    });
  }

  if (req.method === "POST") {
    const {
      rut,
      firstName,
      paternalLastName,
      maternalLastName,
      paralelo,
      ciudad,
      region,
      celular,
      email,
    } = req.body;

    if (!rut || !firstName || !paternalLastName || !maternalLastName || !paralelo) {
      return res.status(400).json({
        success: false,
        message: "Rut, nombres, apellidos y paralelo son obligatorios.",
      });
    }

    const normalizedRut = normalizeForDatabase(rut);

    if (!isValidRut(normalizedRut)) {
      return res.status(400).json({
        success: false,
        message: "El RUT ingresado no es valido.",
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "El correo ingresado no es valido.",
      });
    }

    const exists = await Student.findOne({ rut: normalizedRut });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Ya existe un estudiante con ese RUT.",
      });
    }

    const created = await Student.create({
      rut: normalizedRut,
      firstName,
      paternalLastName,
      maternalLastName,
      paralelo,
      ciudad,
      region,
      celular,
      email,
    });

    return res.status(201).json({
      success: true,
      message: "Estudiante creado correctamente.",
      data: created,
    });
  }

  return res.status(405).json({ success: false, message: "Metodo no permitido." });
}