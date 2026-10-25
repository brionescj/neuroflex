import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth";
import { connectDB } from "../../db";
import { GameAttempt } from "../../models/GameAttempt";
import { GameLevelResult } from "../../models/GameLevelResult";
import { ensureCurrentSession } from "../../sessions";
import {
  buildStudentScores,
  type ScoreAttempt,
  type ScoreResult,
} from "../../studentScores";

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

  const [attempts, results] = await Promise.all([
    GameAttempt.find({ studentRut: payload.rut })
      .select("attemptId gameId attemptNumber status")
      .lean() as Promise<ScoreAttempt[]>,
    GameLevelResult.find({ studentRut: payload.rut })
      .select("attemptId gameId key index tryNumber metrics")
      .lean() as Promise<ScoreResult[]>,
  ]);

  return res.status(200).json({
    success: true,
    message: "Puntuaciones obtenidas.",
    data: buildStudentScores({ attempts, results }),
  });
}
