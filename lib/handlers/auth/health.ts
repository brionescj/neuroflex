import type { VercelRequest, VercelResponse } from "@vercel/node";

import { connectDB } from "../../db";

/**
 * "Calienta" el servidor: hace que la funcion arranque y abra la conexion a la base.
 * La pagina de inicio de sesion la llama apenas se abre; mientras la persona escribe
 * su RUT y su contraseña, el servidor ya esta listo y el inicio de sesion no paga ese
 * arranque. No lee ni devuelve datos.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  await connectDB();

  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({ success: true, message: "Listo." });
}
