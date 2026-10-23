import type { VercelRequest, VercelResponse } from "@vercel/node";

import adminFindRole from "./handlers/admin/findRole";
import adminMiniCases from "./handlers/admin/miniCases";
import adminStats from "./handlers/admin/statsChart";
import adminStatsCatalog from "./handlers/admin/statsCatalog";
import adminStudentDetails from "./handlers/admin/studentDetails";
import adminStudents from "./handlers/admin/students";
import adminStudentStatus from "./handlers/admin/studentStatus";
import adminTeachers from "./handlers/admin/teachers";
import adminTeacherStatus from "./handlers/admin/teacherStatus";
import authLogin from "./handlers/auth/login";
import authLogout from "./handlers/auth/logout";
import authMe from "./handlers/auth/me";
import authRegister from "./handlers/auth/register";
import gamesAccess from "./handlers/games/access";
import gamesAttempts from "./handlers/games/attempts";
import gamesProgress from "./handlers/games/progress";
import miniCasesBank from "./handlers/miniCases/bank";
import miniCasesSubmit from "./handlers/miniCases/submit";
import profileContact from "./handlers/profile/contact";
import profileOne from "./handlers/profile/profile";

/**
 * Todas las rutas de la API viven en UNA sola funcion de Vercel
 * (api/index.ts), que reparte cada peticion al handler que corresponde.
 * vercel.json reescribe /api/* hacia esa funcion; un catch-all de archivo
 * ([...route].ts) no sirve: Vercel solo lo asocia a un segmento (/api/auth).
 * Vercel crea una funcion por cada archivo de api/ y el plan gratuito limita
 * cuantas se pueden desplegar; asi el numero de rutas ya no importa. Las URLs
 * publicas son las mismas de siempre.
 *
 * Para agregar una ruta: crear su handler en lib/handlers/ y anotarla aqui. Un
 * test comprueba que no quede ningun handler sin ruta (ni al reves).
 */
type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

export type RouteDef = {
  /** Camino sin "/api"; ":nombre" captura un segmento y lo expone en req.query. */
  pattern: string;
  handler: Handler;
};

export const ROUTES: RouteDef[] = [
  { pattern: "auth/login", handler: authLogin },
  { pattern: "auth/logout", handler: authLogout },
  { pattern: "auth/me", handler: authMe },
  { pattern: "auth/register", handler: authRegister },

  { pattern: "admin/find-role", handler: adminFindRole },
  { pattern: "admin/mini-cases", handler: adminMiniCases },
  { pattern: "admin/stats/catalog", handler: adminStatsCatalog },
  { pattern: "admin/stats/chart", handler: adminStats },
  { pattern: "admin/students", handler: adminStudents },
  { pattern: "admin/students/:rut/details", handler: adminStudentDetails },
  { pattern: "admin/students/:rut/status", handler: adminStudentStatus },
  { pattern: "admin/teachers", handler: adminTeachers },
  { pattern: "admin/teachers/:rut/status", handler: adminTeacherStatus },

  { pattern: "game-attempts/:gameId", handler: gamesAttempts },
  { pattern: "game-progress/:gameId", handler: gamesProgress },
  { pattern: "games/access", handler: gamesAccess },

  { pattern: "mini-cases", handler: miniCasesBank },
  { pattern: "mini-cases/:caseKey/submit", handler: miniCasesSubmit },

  { pattern: "profile/:rut", handler: profileOne },
  { pattern: "profile/:rut/contact", handler: profileContact },
];

export type RouteMatch = { handler: Handler; params: Record<string, string> };

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** Busca la ruta de un camino ya separado en segmentos (sin "/api"). */
export function matchRoute(
  segments: string[],
  routes: RouteDef[] = ROUTES,
): RouteMatch | null {
  for (const route of routes) {
    const parts = route.pattern.split("/");

    if (parts.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let matches = true;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] as string;
      const segment = segments[i] as string;

      if (part.startsWith(":")) {
        const value = decode(segment);

        if (value === null || value === "") {
          matches = false;
          break;
        }

        params[part.slice(1)] = value;
      } else if (part !== segment) {
        matches = false;
        break;
      }
    }

    if (matches) return { handler: route.handler, params };
  }

  return null;
}

function splitPath(path: string): string[] {
  return path.split("/").filter((segment) => segment !== "");
}

/**
 * Los segmentos del camino pedido, sin "/api". Se leen de la URL original; si
 * la plataforma entregara la ruta interna de la funcion (/api o /api/index) en
 * su lugar, se usa el parametro "route", si lo hay.
 */
export function routeSegments(req: {
  url?: string;
  query?: Record<string, unknown>;
}): string[] {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
  const segments = splitPath(pathname);

  if (segments[0] === "api") segments.shift();

  const isInternal = segments.length === 0 || segments[0] === "index";
  const param = req.query?.route;

  if (isInternal && param !== undefined) {
    return Array.isArray(param)
      ? param.flatMap((p) => splitPath(String(p)))
      : splitPath(String(param));
  }

  return segments;
}

export async function dispatch(
  req: VercelRequest,
  res: VercelResponse,
  routes: RouteDef[] = ROUTES,
) {
  const match = matchRoute(routeSegments(req), routes);

  if (!match) {
    return res.status(404).json({
      success: false,
      message: "Ruta no encontrada.",
    });
  }

  // Los handlers leen sus parametros de req.query (como cuando eran archivos
  // dinamicos de Vercel). "route" es del catch-all, no de la peticion.
  const { route: _route, ...query } = (req.query ?? {}) as Record<
    string,
    unknown
  >;

  Object.defineProperty(req, "query", {
    value: { ...query, ...match.params },
    configurable: true,
    enumerable: true,
    writable: true,
  });

  return match.handler(req, res);
}
