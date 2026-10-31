import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth.js";
import { connectDB } from "../../db.js";
import { buildChart } from "../../stats/charts.js";
import { loadChartData } from "../../stats/loadData.js";
import { parseChartRequest } from "../../stats/request.js";

/** Calcula un grafico con los filtros y la comparacion que pide la pantalla. */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  const parsed = parseChartRequest((req.query ?? {}) as Record<string, unknown>);

  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.message });
  }

  await connectDB();

  const data = await loadChartData(parsed.def);

  return res.status(200).json({
    success: true,
    message: "Grafico calculado.",
    data: buildChart(parsed.def, parsed.request, data),
  });
}
