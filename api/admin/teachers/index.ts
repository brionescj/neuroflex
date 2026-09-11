import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";
import { isValidRut, normalizeForDatabase } from "../../../lib/rut";
import { Teacher } from "../../../lib/models/Teacher";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  await connectDB();

  if (req.method === "GET") {
    const teachers = await Teacher.find().sort({ paternalLastName: 1 });

    return res.status(200).json({
      success: true,
      message: "Listado obtenido.",
      data: teachers,
    });
  }

  if (req.method === "POST") {
    const { rut, firstName, paternalLastName, maternalLastName } = req.body;

    if (!rut || !firstName || !paternalLastName || !maternalLastName) {
      return res.status(400).json({
        success: false,
        message: "Rut, nombres y apellidos son obligatorios.",
      });
    }

    const normalizedRut = normalizeForDatabase(rut);

    if (!isValidRut(normalizedRut)) {
      return res.status(400).json({
        success: false,
        message: "El RUT ingresado no es valido.",
      });
    }

    const exists = await Teacher.findOne({ rut: normalizedRut });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Ya existe un docente con ese RUT.",
      });
    }

    const created = await Teacher.create({
      rut: normalizedRut,
      firstName,
      paternalLastName,
      maternalLastName,
    });

    return res.status(201).json({
      success: true,
      message: "Docente creado correctamente.",
      data: created,
    });
  }

  return res.status(405).json({ success: false, message: "Metodo no permitido." });
}