import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth";
import { connectDB } from "../../db";
import { GameAttempt } from "../../models/GameAttempt";
import { GameLevelResult } from "../../models/GameLevelResult";
import { Student } from "../../models/Student";
import { RUT_LIKE } from "../../stats/request";
import {
  HISTORY_PAGE_SIZE,
  historyPage,
  historyRow,
  historyWindow,
  parseHistoryQuery,
} from "../../stats/studentHistory";
import type { AttemptRow, ResultRow } from "../../stats/types";

const ATTEMPT_FIELDS = "attemptId studentRut gameId attemptNumber status startedAt lastActivityAt finishedAt";

const RESULT_FIELDS =
  "attemptId gameId index activeMsNet metrics.passed metrics.correctCount metrics.sequenceLength";

/** Una pagina del «partida a partida» de un estudiante, con filtro opcional por fecha de inicio. */
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

  const parsed = parseHistoryQuery(req.query);

  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.message });
  }

  await connectDB();

  if (!(await Student.exists({ rut, isDeleted: { $ne: true } }))) {
    return res.status(404).json({ success: false, message: "No se encontro al estudiante." });
  }

  const { from, until } = historyWindow(parsed.query);
  const filter: Record<string, unknown> = { studentRut: rut };

  if (from !== null || until !== null) {
    filter.startedAt = { ...(from ? { $gte: from } : {}), ...(until ? { $lt: until } : {}) };
  }

  const [total, attempts] = await Promise.all([
    GameAttempt.countDocuments(filter),
    GameAttempt.find(filter)
      .sort({ startedAt: -1, _id: -1 })
      .skip((parsed.query.page - 1) * HISTORY_PAGE_SIZE)
      .limit(HISTORY_PAGE_SIZE)
      .select(ATTEMPT_FIELDS)
      .lean() as Promise<AttemptRow[]>,
  ]);

  // Solo los resultados de las partidas de esta pagina.
  const results = (await GameLevelResult.find({ attemptId: { $in: attempts.map((a) => a.attemptId) } })
    .select(RESULT_FIELDS)
    .lean()) as ResultRow[];

  for (const result of results) {
    if (!result.metrics) result.metrics = {};
  }

  const now = new Date();
  const rows = attempts.map((attempt) =>
    historyRow(attempt, results.filter((r) => r.attemptId === attempt.attemptId), now),
  );

  return res.status(200).json({
    success: true,
    message: "Historial obtenido.",
    data: historyPage(rows, total, parsed.query.page),
  });
}
