import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../lib/auth";
import { connectDB } from "../../lib/db";
import { GameProgress, type GameId } from "../../lib/models/GameProgress";

const VALID_GAME_IDS: GameId[] = ["color-sequence", "mini-cases"];

function isValidGameId(value: unknown): value is GameId {
  return (
    typeof value === "string" && VALID_GAME_IDS.includes(value as GameId)
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const payload = requireAuth(req, res, ["student"]);
  if (!payload) return;

  const gameId = req.query.gameId;

  if (!isValidGameId(gameId)) {
    return res.status(400).json({
      success: false,
      message: "gameId invalido.",
    });
  }

  await connectDB();

  if (req.method === "GET") {
    const progress = await GameProgress.findOne({
      studentRut: payload.rut,
      gameId,
    });

    return res.status(200).json({
      success: true,
      message: progress ? "Progreso encontrado." : "Sin progreso guardado.",
      data: progress ? progress.state : null,
    });
  }

  if (req.method === "PUT") {
    const state = req.body?.state;

    if (state === undefined) {
      return res.status(400).json({
        success: false,
        message: "Falta el campo state.",
      });
    }

    await GameProgress.findOneAndUpdate(
      { studentRut: payload.rut, gameId },
      { studentRut: payload.rut, gameId, state },
      { upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Progreso guardado.",
    });
  }

  if (req.method === "DELETE") {
    await GameProgress.deleteOne({ studentRut: payload.rut, gameId });

    return res.status(200).json({
      success: true,
      message: "Progreso eliminado.",
    });
  }

  return res
    .status(405)
    .json({ success: false, message: "Metodo no permitido." });
}
