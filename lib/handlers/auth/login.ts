import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";
import { verifyPassword } from "../../password";
import { signToken } from "../../jwt";
import { setSessionCookie } from "../../cookies";
import { normalizeForDatabase } from "../../rut";
import { findAccount } from "../../findAccount";
import { findSessionProfile } from "../../findProfile";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  await connectDB();

  const { password, rut: rawRut } = req.body ?? {};

  if (typeof password !== "string" || typeof rawRut !== "string") {
    return res.status(401).json({ success: false, message: "RUT o contraseña incorrectos." });
  }

  const rut = normalizeForDatabase(rawRut);

  const account = await findAccount(rut);

  if (!account) {
    return res.status(401).json({ success: false, message: "RUT o contraseña incorrectos." });
  }

  // Una cuenta de un rol que ya no existe (docente) no puede entrar. Se responde
  // igual que con una clave incorrecta: no se revela que el RUT existe.
  if (account.role !== "student" && account.role !== "admin") {
    return res.status(401).json({ success: false, message: "RUT o contraseña incorrectos." });
  }

  // Comprobar la contraseña (bcrypt, lo mas lento del inicio de sesion) y leer la
  // ficha son independientes: se hacen a la vez. Si la contraseña resulta
  // incorrecta, la ficha leida simplemente se descarta.
  const [passwordOk, profile] = await Promise.all([
    verifyPassword(password, account.password),
    findSessionProfile(account.rut, account.role),
  ]);

  if (!passwordOk) {
    return res.status(401).json({ success: false, message: "RUT o contraseña incorrectos." });
  }

  if (!account.enabled) {
    return res.status(403).json({ success: false, message: "Cuenta deshabilitada." });
  }

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
  setSessionCookie(res, token, account.role);

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