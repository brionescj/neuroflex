import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth";
import { connectDB } from "../../db";
import {
  isPermutationOfOptions,
  scoreMiniCaseOrder,
} from "../../miniCaseScoring";
import { resolveMiniCasesAccess } from "../../gameUnlocksStore";
import { MiniCase } from "../../models/MiniCase";

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

  if (
    !isPermutationOfOptions(miniCase.options, orderedOptionKeys as string[])
  ) {
    return res
      .status(400)
      .json({ success: false, message: "El orden elegido no es valido." });
  }

  // Las secuencias alternativas (si el caso las tiene) tambien cuentan como
  // correctas: nadie queda como fallido por elegir una valida.
  const { correctSteps, isFullyCorrect } = scoreMiniCaseOrder(
    miniCase.options,
    orderedOptionKeys as string[],
    miniCase.alternateOrders ?? [],
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
