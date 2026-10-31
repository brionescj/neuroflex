import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth.js";
import { connectDB } from "../../db.js";
import { GameAttempt } from "../../models/GameAttempt.js";
import { GameLevelResult } from "../../models/GameLevelResult.js";
import { MiniCase } from "../../models/MiniCase.js";
import { ensureCurrentSession } from "../../sessions.js";
import {
  buildStudentScores,
  type ScoreAttempt,
  type ScoreResult,
} from "../../studentScores.js";

/**
 * Puntajes, insignias y graficos del propio estudiante. Solo lee SUS datos
 * (el rut sale de la sesion, nunca de la solicitud) y no incluye tiempos.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["student"]);
  if (!payload) return;

  await connectDB();

  if (!(await ensureCurrentSession(payload, res))) return;

  const [attempts, results, bank] = await Promise.all([
    GameAttempt.find({ studentRut: payload.rut })
      .select("attemptId gameId attemptNumber status")
      .lean() as Promise<ScoreAttempt[]>,
    GameLevelResult.find({ studentRut: payload.rut })
      .select("attemptId gameId key index tryNumber metrics completedAt")
      .lean() as Promise<ScoreResult[]>,
    MiniCase.find().select("caseKey").lean() as Promise<{ caseKey: string }[]>,
  ]);

  // Numerados como en el banco (caso-2 antes que caso-10), para que "Caso 3" sea siempre el mismo.
  const caseKeys = bank
    .map((item) => item.caseKey)
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));

  return res.status(200).json({
    success: true,
    message: "Puntuaciones obtenidas.",
    data: buildStudentScores({ attempts, results, caseKeys }),
  });
}
