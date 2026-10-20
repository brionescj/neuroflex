import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../../lib/auth";
import { connectDB } from "../../../lib/db";
import { scoreMiniCaseOrder } from "../../../lib/gameAttempts";
import { resolveMiniCasesAccess } from "../../../lib/gameUnlocksStore";
import { MiniCase } from "../../../lib/models/MiniCase";

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

  const caseKey = req.query.caseKey as string;
  const orderedOptionKeys = req.body?.orderedOptionKeys;

  if (!Array.isArray(orderedOptionKeys) || orderedOptionKeys.length !== 4) {
    return res.status(400).json({
      success: false,
      message: "orderedOptionKeys debe tener exactamente 4 elementos.",
    });
  }

  await connectDB();

  if (!(await resolveMiniCasesAccess(payload.rut))) {
    return res
      .status(403)
      .json({ success: false, message: "Este juego aun no esta disponible." });
  }

  const miniCase = await MiniCase.findOne({ caseKey, enabled: true });

  if (!miniCase) {
    return res
      .status(404)
      .json({ success: false, message: "Mini caso no encontrado." });
  }

  const { correctSteps, isFullyCorrect } = scoreMiniCaseOrder(
    miniCase.options,
    orderedOptionKeys as string[],
  );

  return res.status(200).json({
    success: true,
    message: "Respuesta evaluada.",
    data: {
      caseKey,
      correctSteps,
      isFullyCorrect,
    },
  });
}
