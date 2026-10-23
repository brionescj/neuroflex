import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";
import { requireAuth } from "../../auth";
import { hashPassword, validatePasswordStrength } from "../../password";
import { isValidRut, normalizeForDatabase } from "../../rut";
import { Admin } from "../../models/Admin";
import { AuthUser } from "../../models/AuthUser";

const TEXT_FIELDS = ["firstName", "paternalLastName", "maternalLastName"] as const;

/**
 * Los administradores. Quien administra da de alta a otro con su contrasena
 * inicial: no hay autorregistro para este rol, y sin cuenta de acceso la ficha
 * sola no permitiria entrar.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  await connectDB();

  if (req.method === "GET") {
    const admins = await Admin.find().sort({ paternalLastName: 1 }).lean();

    return res.status(200).json({ success: true, message: "Listado obtenido.", data: admins });
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    const names = TEXT_FIELDS.map((field) => (typeof body[field] === "string" ? body[field].trim() : ""));

    if (!body.rut || names.some((name) => !name) || typeof body.password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Rut, nombres, apellidos y contraseña son obligatorios.",
      });
    }

    const rut = normalizeForDatabase(body.rut);

    if (!isValidRut(rut)) {
      return res.status(400).json({ success: false, message: "El RUT ingresado no es valido." });
    }

    const passwordError = validatePasswordStrength(body.password);

    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    // Un RUT con ficha o con cuenta (de cualquier rol) ya esta tomado.
    if ((await Admin.findOne({ rut })) || (await AuthUser.findOne({ rut }))) {
      return res.status(409).json({
        success: false,
        message: "Ya existe una cuenta con ese RUT.",
      });
    }

    const [firstName, paternalLastName, maternalLastName] = names;
    const created = await Admin.create({ rut, firstName, paternalLastName, maternalLastName });

    await AuthUser.create({ rut, password: await hashPassword(body.password), role: "admin" });

    return res.status(201).json({
      success: true,
      message: "Administrador creado correctamente.",
      data: created,
    });
  }

  return res.status(405).json({ success: false, message: "Metodo no permitido." });
}
