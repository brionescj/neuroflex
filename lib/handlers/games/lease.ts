import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth.js";
import { connectDB } from "../../db.js";
import {
  GAME_LEASE_LOST_CODE,
  GAME_LEASE_LOST_MESSAGE,
  claimGame,
  holdsGame,
  isLeaseId,
} from "../../gameLease.js";
import { ensureCurrentSession } from "../../sessions.js";

const GAME_IDS = ["color-sequence", "mini-cases", "node-connection"];

/**
 *   POST { gameId, leaseId }            "este es el lugar donde se juega ahora" (al abrir el juego)
 *   GET  ?gameId=...&leaseId=...        sigue siendo este? (200, o 409 si se abrio en otro lugar)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["student"]);
  if (!payload) return;

  const source = req.method === "POST" ? (req.body ?? {}) : (req.query ?? {});
  const { gameId, leaseId } = source as { gameId?: unknown; leaseId?: unknown };

  if (typeof gameId !== "string" || !GAME_IDS.includes(gameId) || !isLeaseId(leaseId)) {
    return res.status(400).json({ success: false, message: "gameId o leaseId invalido." });
  }

  await connectDB();

  if (!(await ensureCurrentSession(payload, res))) return;

  if (req.method === "POST") {
    await claimGame(payload.rut, gameId, leaseId);

    return res.status(200).json({ success: true, message: "Juego abierto." });
  }

  if (!(await holdsGame(payload.rut, gameId, leaseId))) {
    return res
      .status(409)
      .json({ success: false, code: GAME_LEASE_LOST_CODE, message: GAME_LEASE_LOST_MESSAGE });
  }

  return res.status(200).json({ success: true, message: "Sigue siendo tu partida." });
}
