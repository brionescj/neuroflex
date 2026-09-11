import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../lib/db";
import { verifyPassword } from "../../lib/password";
import { signToken } from "../../lib/jwt";
import { setSessionCookie } from "../../lib/cookies";
import { normalizeForDatabase } from "../../lib/rut";
import { findProfile } from "../../lib/findProfile";
import { AuthUser } from "../../lib/models/AuthUser";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  await connectDB();

  const { password } = req.body;
  const rut = normalizeForDatabase(req.body.rut);

  const account = await AuthUser.findOne({ rut });

  if (!account || !(await verifyPassword(password, account.password))) {
    return res.status(401).json({ success: false, message: "RUT o contraseña incorrectos." });
  }

  if (!account.enabled) {
    return res.status(403).json({ success: false, message: "Cuenta deshabilitada." });
  }

  const profile = await findProfile(account.rut, account.role);

  if (!profile) {
    return res.status(404).json({ success: false, message: "Ficha no encontrada." });
  }

  if (!profile.enabled) {
    return res.status(403).json({
      success: false,
      message: "Su ficha institucional no se encuentra activa.",
    });
  }

  const token = signToken({ id: account.id, rut: account.rut, role: account.role });
  setSessionCookie(res, token);

  return res.status(200).json({
    success: true,
    message: "Sesion iniciada.",
    data: {
      id: account.id,
      rut: account.rut,
      role: account.role,
      displayName: `${profile.firstName} ${profile.paternalLastName}`,
      avatarId: profile.avatarId,
    },
  });
}