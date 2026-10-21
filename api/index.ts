import type { VercelRequest, VercelResponse } from "@vercel/node";

import { dispatch } from "../lib/router";

/**
 * Unica funcion de la API: reparte cada peticion segun su ruta (ver
 * lib/router.ts). vercel.json reescribe /api/* hacia esta funcion y Vercel le
 * entrega la URL original. No agregar mas archivos en api/: cada uno cuenta
 * como una funcion de Vercel y el plan gratuito limita cuantas se despliegan.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return dispatch(req, res);
}
