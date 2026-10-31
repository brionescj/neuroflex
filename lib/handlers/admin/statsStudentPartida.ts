import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth.js";
import { connectDB } from "../../db.js";
import { GameAttempt } from "../../models/GameAttempt.js";
import { GameLevelResult } from "../../models/GameLevelResult.js";
import { MiniCase } from "../../models/MiniCase.js";
import { buildPartidaDetail, type PartidaResult } from "../../stats/partidaDetail.js";
import { RUT_LIKE } from "../../stats/request.js";
import type { AttemptRow } from "../../stats/types.js";

const ATTEMPT_FIELDS = "attemptId studentRut gameId attemptNumber status startedAt lastActivityAt finishedAt";

const RESULT_FIELDS = "attemptId studentRut gameId key index tryNumber activeMsNet completedAt metrics events";

/** Un id de partida es un texto corto; nada que se pueda usar como operador de busqueda. */
const ATTEMPT_ID = /^[A-Za-z0-9_-]{1,80}$/;

/** Los datos de una partida de un estudiante: lo que pidio el juego, lo que hizo y cuanto tardo en cada nivel. */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  const { rut, attemptId } = req.query;

  if (typeof rut !== "string" || !RUT_LIKE.test(rut)) {
    return res.status(400).json({ success: false, message: "El RUT no es valido." });
  }

  if (typeof attemptId !== "string" || !ATTEMPT_ID.test(attemptId)) {
    return res.status(400).json({ success: false, message: "La partida no es valida." });
  }

  await connectDB();

  const attempt = (await GameAttempt.findOne({ attemptId, studentRut: rut })
    .select(ATTEMPT_FIELDS)
    .lean()) as AttemptRow | null;

  if (!attempt) {
    return res.status(404).json({ success: false, message: "No se encontro la partida de este estudiante." });
  }

  const results = (await GameLevelResult.find({ attemptId, studentRut: rut })
    .select(RESULT_FIELDS)
    .lean()) as PartidaResult[];

  for (const result of results) {
    if (!result.metrics) result.metrics = {};
  }

  const caseTitles: Record<string, string> = {};

  if (attempt.gameId === "mini-cases") {
    const cases = (await MiniCase.find({ caseKey: { $in: results.map((r) => r.key) } })
      .select("caseKey title")
      .lean()) as { caseKey: string; title: string }[];

    for (const item of cases) caseTitles[item.caseKey] = item.title;
  }

  return res.status(200).json({
    success: true,
    message: "Partida obtenida.",
    data: buildPartidaDetail(attempt, results, caseTitles, new Date()),
  });
}
