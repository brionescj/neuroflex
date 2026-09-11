import type { VercelRequest, VercelResponse } from "@vercel/node";

import { clearSessionCookie } from "../../lib/cookies";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  clearSessionCookie(res);
  return res.status(200).json({ success: true, message: "Sesion cerrada." });
}