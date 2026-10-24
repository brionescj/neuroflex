import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth";
import { connectDB } from "../../db";
import { RUT_LIKE } from "../../stats/request";
import { loadStudentProfileData } from "../../stats/loadData";
import { buildStudentProfile, parseStatesQuery } from "../../stats/studentProfile";

/** La ficha de desempeno de un estudiante: resumen y graficos por juego (el partida a partida se pide aparte, por paginas). */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  const rut = req.query.rut;

  if (typeof rut !== "string" || !RUT_LIKE.test(rut)) {
    return res.status(400).json({ success: false, message: "El RUT no es valido." });
  }

  const states = parseStatesQuery(req.query);

  if (!states.ok) {
    return res.status(400).json({ success: false, message: states.message });
  }

  await connectDB();

  const profile = buildStudentProfile(rut, await loadStudentProfileData(rut), new Date(), { states: states.states });

  if (!profile) {
    return res.status(404).json({ success: false, message: "No se encontro al estudiante." });
  }

  return res.status(200).json({
    success: true,
    message: "Ficha de desempeno obtenida.",
    data: profile,
  });
}
