import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth";
import { connectDB } from "../../db";
import { nextCaseKey, parseMiniCaseInput } from "../../miniCaseInput";
import { validateAlternateOrders } from "../../miniCaseScoring";
import { MiniCase } from "../../models/MiniCase";

const LETTERS = ["a", "b", "c", "d"];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  await connectDB();

  if (req.method === "GET") {
    const cases = await MiniCase.find().sort({ caseKey: 1 }).lean();

    return res.status(200).json({
      success: true,
      message: "Listado obtenido.",
      data: cases,
    });
  }

  if (req.method === "POST") {
    const parsed = parseMiniCaseInput(req.body);

    if (!parsed.ok) {
      return res.status(400).json({ success: false, message: parsed.message });
    }

    const input = parsed.value;

    // Sin clave es un caso nuevo: toma el siguiente numero libre.
    const caseKey =
      input.caseKey ?? nextCaseKey((await MiniCase.find().select("caseKey").lean()).map((c: { caseKey: string }) => c.caseKey));

    const existing = input.caseKey
      ? ((await MiniCase.findOne({ caseKey }).lean()) as {
          options: { optionKey: string }[];
          alternateOrders?: string[][];
          imageKey?: string;
        } | null)
      : null;

    // Las claves de las alternativas se conservan: los resultados guardados las usan para saber
    // cual alternativa fallo cada estudiante.
    const options = input.options.map((option, index) => ({
      optionKey: option.optionKey ?? `${caseKey}-${LETTERS[index]}`,
      text: option.text,
      correctStep: option.correctStep,
    }));

    if (new Set(options.map((o) => o.optionKey)).size !== 4) {
      return res.status(400).json({ success: false, message: "Dos alternativas tienen la misma clave." });
    }

    if (existing) {
      const saved = new Set(existing.options.map((o) => o.optionKey));

      if (options.some((o) => !saved.has(o.optionKey))) {
        return res.status(400).json({
          success: false,
          message: "Las alternativas de un caso existente conservan su clave; no se pueden reemplazar por otras.",
        });
      }
    }

    // Sin secuencias alternativas en el envio, se conservan las que el caso ya tenia.
    const alternateOrders = input.alternateOrders ?? existing?.alternateOrders ?? [];
    const alternateError = validateAlternateOrders(options, alternateOrders);

    if (alternateError) {
      return res.status(400).json({ success: false, message: alternateError });
    }

    const updated = await MiniCase.findOneAndUpdate(
      { caseKey },
      {
        caseKey,
        title: input.title,
        // Un caso sin imagen conserva la que tenia; si es nuevo, el banco usa la predeterminada.
        ...(input.imageKey ? { imageKey: input.imageKey } : {}),
        baseText: input.baseText,
        twistText: input.twistText,
        promptText: input.promptText,
        options,
        feedback: input.feedback,
        alternateOrders,
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: existing ? "Mini caso actualizado." : "Mini caso guardado.",
      data: updated,
    });
  }

  return res
    .status(405)
    .json({ success: false, message: "Metodo no permitido." });
}
