import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireAuth } from "../../auth.js";
import { connectDB } from "../../db.js";
import { resolveMiniCasesAccess } from "../../gameUnlocksStore.js";
import { ensureCurrentSession } from "../../sessions.js";

/**
 * A que juegos con desbloqueo tiene acceso el estudiante. Solo dice si o no:
 * no revela cuanto le falta, para no predisponer a quien juega.
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

  return res.status(200).json({
    success: true,
    message: "Acceso a juegos obtenido.",
    data: { miniCases: await resolveMiniCasesAccess(payload.rut) },
  });
}
