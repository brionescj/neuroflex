import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth.js";
import { connectDB } from "../../db.js";
import { buildCatalog } from "../../stats/catalog.js";
import { loadStudents } from "../../stats/loadData.js";

/**
 * Lo que la pantalla de estadisticas necesita para armarse: juegos, graficos
 * con su explicacion, filtros posibles y estudiantes habilitados.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  await connectDB();

  const students = await loadStudents();

  return res.status(200).json({
    success: true,
    message: "Catalogo obtenido.",
    data: buildCatalog(students),
  });
}
