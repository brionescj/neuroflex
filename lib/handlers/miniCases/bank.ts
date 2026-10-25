import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth";
import { connectDB } from "../../db";
import { resolveMiniCasesAccess } from "../../gameUnlocksStore";
import { MiniCase } from "../../models/MiniCase";
import { ensureCurrentSession } from "../../sessions";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }

  return copy;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["student", "admin"]);
  if (!payload) return;

  await connectDB();

  if (!(await ensureCurrentSession(payload, res))) return;

  // El administrador ve el banco siempre; el estudiante, solo
  // cuando desbloqueo Mini Casos.
  if (payload.role === "student" && !(await resolveMiniCasesAccess(payload.rut))) {
    return res
      .status(403)
      .json({ success: false, message: "Este juego aun no esta disponible." });
  }

  // Solo los campos que se entregan (correctStep ni se lee) y como objetos planos.
  const cases = await MiniCase.find({ enabled: true })
    .select("caseKey baseText twistText promptText feedback options.optionKey options.text")
    .sort({ caseKey: 1 })
    .lean();

  // correctStep nunca sale de aqui, y el orden de opciones (y de los
  // casos mismos) se mezcla en cada request: si el orden correcto fuera
  // predecible de antemano, la actividad dejaria de medir nada. Tampoco
  // sale "title" ("Mini Caso 4"): el alumno ve una numeracion correlativa
  // de su partida, no el numero real del caso en el banco.
  const sanitized = cases.map((c) => ({
    caseKey: c.caseKey,
    baseText: c.baseText,
    twistText: c.twistText,
    promptText: c.promptText,
    feedback: c.feedback,
    options: shuffle(
      c.options.map((o: { optionKey: string; text: string }) => ({
        optionKey: o.optionKey,
        text: o.text,
      })),
    ),
  }));

  return res.status(200).json({
    success: true,
    message: "Banco de mini casos obtenido.",
    data: shuffle(sanitized),
  });
}
