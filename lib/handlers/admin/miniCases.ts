import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth";
import { connectDB } from "../../db";
import { validateAlternateOrders } from "../../miniCaseScoring";
import { MiniCase } from "../../models/MiniCase";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  await connectDB();

  if (req.method === "GET") {
    const cases = await MiniCase.find().sort({ caseKey: 1 });

    return res.status(200).json({
      success: true,
      message: "Listado obtenido.",
      data: cases,
    });
  }

  if (req.method === "POST") {
    const {
      caseKey,
      title,
      baseText,
      twistText,
      promptText,
      options,
      feedback,
      alternateOrders,
    } = req.body ?? {};

    if (
      !caseKey ||
      !title ||
      !baseText ||
      !twistText ||
      !promptText ||
      !feedback
    ) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios.",
      });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Se requieren exactamente 4 opciones.",
      });
    }

    const steps: number[] = options.map(
      (o: { correctStep: number }) => o.correctStep,
    );
    const stepsAreValid =
      new Set(steps).size === 4 &&
      steps.every((s) => [1, 2, 3, 4].includes(s));

    if (!stepsAreValid) {
      return res.status(400).json({
        success: false,
        message:
          "Las 4 opciones deben tener correctStep unico, cubriendo 1 a 4.",
      });
    }

    const alternateError = validateAlternateOrders(options, alternateOrders);

    if (alternateError) {
      return res.status(400).json({ success: false, message: alternateError });
    }

    const updated = await MiniCase.findOneAndUpdate(
      { caseKey },
      {
        caseKey,
        title,
        baseText,
        twistText,
        promptText,
        options,
        feedback,
        // El seed es la fuente de verdad: si no trae secuencias alternativas,
        // el caso queda sin ellas.
        alternateOrders: alternateOrders ?? [],
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Mini caso guardado.",
      data: updated,
    });
  }

  return res
    .status(405)
    .json({ success: false, message: "Metodo no permitido." });
}
