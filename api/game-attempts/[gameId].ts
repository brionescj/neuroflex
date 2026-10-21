import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../lib/auth";
import { connectDB } from "../../lib/db";
import {
  isAttemptGameId,
  parseAttemptInfo,
  parseCloseStatus,
  parseLevelReport,
  type LevelReport,
} from "../../lib/gameAttempts";
import {
  closeAttempt,
  ensureAttempt,
  saveLevelResults,
} from "../../lib/gameAttemptsStore";
import { MINI_CASES_UNLOCK_LEVEL } from "../../lib/gameUnlocks";
import { resolveMiniCasesAccess } from "../../lib/gameUnlocksStore";

/** Tope de resultados por lote: ninguna partida real se acerca. */
const MAX_BATCH = 100;

/**
 * Registro de partidas para el analisis. POST con tres formas:
 *   { type: "level", attempt, result }            guarda un nivel o caso
 *   { type: "close", attempt, status }            cierra el intento
 *   { type: "batch", attempt, results, status? }  guarda varios y, si trae
 *                                                 status, cierra el intento
 * Todas son idempotentes: reenviar lo mismo no duplica nada, de modo que el
 * navegador puede reintentar sin riesgo.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["student"]);
  if (!payload) return;

  const gameId = req.query.gameId;

  if (!isAttemptGameId(gameId)) {
    return res
      .status(400)
      .json({ success: false, message: "gameId invalido." });
  }

  const type = req.body?.type;

  if (type !== "level" && type !== "close" && type !== "batch") {
    return res.status(400).json({
      success: false,
      message: "type debe ser level, close o batch.",
    });
  }

  const info = parseAttemptInfo(req.body?.attempt);

  if (!info.ok) {
    return res.status(400).json({ success: false, message: info.message });
  }

  // Se valida todo antes de tocar la base.
  const reports: LevelReport[] = [];

  if (type === "level" || type === "batch") {
    const raws: unknown[] =
      type === "level" ? [req.body?.result] : req.body?.results;

    if (!Array.isArray(raws) || raws.length > MAX_BATCH) {
      return res
        .status(400)
        .json({ success: false, message: "results invalido." });
    }

    for (const raw of raws) {
      const parsed = parseLevelReport(gameId, raw);

      if (!parsed.ok) {
        return res
          .status(400)
          .json({ success: false, message: parsed.message });
      }

      reports.push(parsed.value);
    }

    // Dos resultados con la misma clave en un lote se pisarian entre si.
    if (new Set(reports.map((r) => r.key)).size !== reports.length) {
      return res
        .status(400)
        .json({ success: false, message: "Hay claves repetidas." });
    }
  }

  const rawStatus =
    type === "close"
      ? req.body?.status
      : type === "batch"
        ? req.body?.status ?? null
        : null;
  const status =
    type === "close" || (type === "batch" && rawStatus !== null)
      ? parseCloseStatus(rawStatus)
      : null;

  if (status && !status.ok) {
    return res.status(400).json({ success: false, message: status.message });
  }

  if (type === "batch" && reports.length === 0 && !status) {
    return res
      .status(400)
      .json({ success: false, message: "El lote esta vacio." });
  }

  await connectDB();

  if (gameId === "mini-cases" && !(await resolveMiniCasesAccess(payload.rut))) {
    return res
      .status(403)
      .json({ success: false, message: "Este juego aun no esta disponible." });
  }

  const attempt = await ensureAttempt(payload.rut, gameId, info.value);

  if (!attempt) {
    return res
      .status(403)
      .json({ success: false, message: "El intento no te pertenece." });
  }

  if (reports.length > 0) {
    const outcome = await saveLevelResults(
      payload.rut,
      gameId,
      attempt,
      info.value.sessionId,
      info.value.device,
      reports,
    );

    if (outcome === "unknown-case") {
      return res
        .status(404)
        .json({ success: false, message: "Mini caso no encontrado." });
    }

    if (outcome === "invalid-order") {
      return res
        .status(400)
        .json({ success: false, message: "El orden elegido no es valido." });
    }
  }

  if (status?.ok) {
    await closeAttempt(gameId, attempt, status.value);
  }

  // Al llegar al nivel 10 se anota el desbloqueo en el momento, para que el
  // logro quede registrado aunque el estudiante deje de jugar despues. Si
  // falla, el resultado ya esta guardado y se anotara en la proxima consulta.
  if (
    gameId !== "mini-cases" &&
    reports.some((r) => r.index >= MINI_CASES_UNLOCK_LEVEL)
  ) {
    try {
      await resolveMiniCasesAccess(payload.rut);
    } catch {
      // No debe hacer fallar el guardado de la partida.
    }
  }

  return res.status(200).json({
    success: true,
    message: status?.ok ? "Intento cerrado." : "Resultado guardado.",
    data: { attemptNumber: attempt.attemptNumber },
  });
}
