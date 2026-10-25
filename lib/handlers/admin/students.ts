import type { VercelRequest, VercelResponse } from "@vercel/node";
import { connectDB } from "../../db";
import { requireAuth } from "../../auth";
import { isValidRut, normalizeForDatabase } from "../../rut";
import { Student } from "../../models/Student";
import { parseStudentDetails } from "../../studentFields";

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
    const { rut, firstName, paternalLastName, maternalLastName, paralelo } = req.body ?? {};

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

    // Nombres y apellidos (con la inicial de cada palabra en mayuscula) y datos
    // opcionales de la ficha: ciudad, region, celular, correo, genero,
    // universidad y fecha de nacimiento. Se validan igual que al editarlos.
    const details = parseStudentDetails(req.body, { requireChanges: false });

    if (!details.ok) {
      return res.status(400).json({ success: false, message: details.message });
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
      paralelo,
      ...details.set,
    });

    return res.status(201).json({
      success: true,
      message: "Estudiante creado correctamente.",
      data: created,
    });
  }

  return res.status(405).json({ success: false, message: "Metodo no permitido." });
}