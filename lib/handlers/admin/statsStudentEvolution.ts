import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth";
import { connectDB } from "../../db";
import { GameAttempt } from "../../models/GameAttempt";
import { GameLevelResult } from "../../models/GameLevelResult";
import { Student } from "../../models/Student";
import { RUT_LIKE } from "../../stats/request";
import { buildEvolution, parseEvolutionQuery } from "../../stats/studentEvolution";
import type { AttemptRow, ResultRow } from "../../stats/types";

const ATTEMPT_FIELDS = "attemptId studentRut gameId attemptNumber status startedAt lastActivityAt";

const RESULT_FIELDS =
  "attemptId studentRut gameId index tryNumber activeMsNet metrics.passed metrics.correctCount metrics.sequenceLength metrics.correctSteps";

/** Los promedios de un estudiante por semana o por mes, juego por juego. Solo lee los datos de ese estudiante. */
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

  const parsed = parseEvolutionQuery(req.query);

  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.message });
  }

  await connectDB();

  if (!(await Student.exists({ rut, isDeleted: { $ne: true } }))) {
    return res.status(404).json({ success: false, message: "No se encontro al estudiante." });
  }

  const [attempts, results] = await Promise.all([
    GameAttempt.find({ studentRut: rut }).select(ATTEMPT_FIELDS).lean() as Promise<AttemptRow[]>,
    GameLevelResult.find({ studentRut: rut }).select(RESULT_FIELDS).lean() as Promise<ResultRow[]>,
  ]);

  for (const result of results) {
    if (!result.metrics) result.metrics = {};
  }

  return res.status(200).json({
    success: true,
    message: "Evolucion obtenida.",
    data: buildEvolution(rut, attempts, results, parsed.by, parsed.span),
  });
}
