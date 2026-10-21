import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

// Los handlers reales exigen estas variables al importarse.
vi.hoisted(() => {
  process.env.MONGODB_URI = "mongodb://localhost:27017/test";
  process.env.JWT_SECRET = "secreto-de-prueba";
});

import adminFindRole from "./handlers/admin/findRole";
import adminMiniCases from "./handlers/admin/miniCases";
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
import { ROUTES, dispatch, matchRoute, routeSegments, type RouteDef } from "./router";

const seg = (path: string) => path.split("/").filter(Boolean);

// Las 18 rutas de la API, con las URLs que usa el navegador. Si este test falla
// al agregar o mover una ruta, la tabla de lib/router.ts no esta al dia.
const EXPECTED: [string, unknown, Record<string, string>][] = [
  ["auth/login", authLogin, {}],
  ["auth/logout", authLogout, {}],
  ["auth/me", authMe, {}],
  ["auth/register", authRegister, {}],
  ["admin/find-role", adminFindRole, {}],
  ["admin/mini-cases", adminMiniCases, {}],
  ["admin/students", adminStudents, {}],
  ["admin/students/12345678-9/details", adminStudentDetails, { rut: "12345678-9" }],
  ["admin/students/12345678-9/status", adminStudentStatus, { rut: "12345678-9" }],
  ["admin/teachers", adminTeachers, {}],
  ["admin/teachers/98765432-1/status", adminTeacherStatus, { rut: "98765432-1" }],
  ["game-attempts/color-sequence", gamesAttempts, { gameId: "color-sequence" }],
  ["game-progress/node-connection", gamesProgress, { gameId: "node-connection" }],
  ["games/access", gamesAccess, {}],
  ["mini-cases", miniCasesBank, {}],
  ["mini-cases/caso-4/submit", miniCasesSubmit, { caseKey: "caso-4" }],
  ["profile/12345678-9", profileOne, { rut: "12345678-9" }],
  ["profile/12345678-9/contact", profileContact, { rut: "12345678-9" }],
];

describe("tabla de rutas", () => {
  it.each(EXPECTED)("%s llega a su handler con sus parametros", (path, handler, params) => {
    const match = matchRoute(seg(path));

    expect(match?.handler).toBe(handler);
    expect(match?.params).toEqual(params);
  });

  it("hay exactamente una entrada por cada ruta esperada, sin patrones repetidos", () => {
    expect(ROUTES).toHaveLength(EXPECTED.length);
    expect(new Set(ROUTES.map((r) => r.pattern)).size).toBe(ROUTES.length);
    expect(new Set(ROUTES.map((r) => r.handler)).size).toBe(ROUTES.length);
  });

  it("rutas que no existen no llegan a ningun handler", () => {
    for (const path of [
      "",
      "auth",
      "auth/login/extra",
      "auth/Login",
      "admin/students/12345678-9",
      "admin/students/12345678-9/otra",
      "games/access/extra",
      "mini-cases/caso-4",
      "mini-cases/caso-4/otra",
      "profile",
      "profile/12345678-9/otra",
      "nada",
    ]) {
      expect(matchRoute(seg(path)), path).toBeNull();
    }
  });

  it("un parametro con caracteres codificados se decodifica", () => {
    expect(matchRoute(seg("profile/12.345.678-9"))?.params.rut).toBe("12.345.678-9");
    expect(matchRoute(seg("profile/a%20b"))?.params.rut).toBe("a b");
  });

  it("un parametro mal codificado no coincide en vez de romper", () => {
    expect(matchRoute(seg("profile/%E0%A4%A"))).toBeNull();
  });
});

describe("routeSegments", () => {
  it("quita /api y la query de la URL original", () => {
    expect(routeSegments({ url: "/api/admin/students?page=2&q=ana" })).toEqual([
      "admin",
      "students",
    ]);
  });

  it("tolera una barra final y barras repetidas", () => {
    expect(routeSegments({ url: "/api/auth/me/" })).toEqual(["auth", "me"]);
    expect(routeSegments({ url: "/api//auth//me" })).toEqual(["auth", "me"]);
  });

  it("si la plataforma entrega la ruta interna de la funcion, usa el parametro route", () => {
    expect(
      routeSegments({ url: "/api/index?route=auth/login", query: { route: "auth/login" } }),
    ).toEqual(["auth", "login"]);
    expect(
      routeSegments({ url: "/api", query: { route: ["admin", "students"] } }),
    ).toEqual(["admin", "students"]);
  });

  it("la URL real manda sobre el parametro cuando trae ruta", () => {
    expect(
      routeSegments({ url: "/api/auth/me", query: { route: ["admin", "students"] } }),
    ).toEqual(["auth", "me"]);
  });

  it("sin URL no revienta", () => {
    expect(routeSegments({})).toEqual([]);
  });
});

function fakeRes() {
  const out: { status: number; body: unknown } = { status: 0, body: undefined };
  const res = {
    status(code: number) {
      out.status = code;

      return res;
    },
    json(body: unknown) {
      out.body = body;

      return res;
    },
  };

  return { res: res as unknown as VercelResponse, out };
}

describe("dispatch", () => {
  it("ruta desconocida: 404 con el formato de la API", async () => {
    const { res, out } = fakeRes();

    await dispatch({ url: "/api/nada", query: {} } as unknown as VercelRequest, res);

    expect(out).toEqual({
      status: 404,
      body: { success: false, message: "Ruta no encontrada." },
    });
  });

  it("entrega los parametros de la ruta en req.query, sin 'route' y conservando la query real", async () => {
    let seen: Record<string, unknown> | undefined;
    const routes: RouteDef[] = [
      {
        pattern: "admin/students/:rut/status",
        handler: (req) => {
          seen = req.query;
        },
      },
    ];
    const req = {
      url: "/api/admin/students/12345678-9/status?force=1",
      method: "PATCH",
      query: { route: ["admin", "students", "12345678-9", "status"], force: "1" },
    } as unknown as VercelRequest;

    await dispatch(req, fakeRes().res, routes);

    expect(seen).toEqual({ rut: "12345678-9", force: "1" });
    expect(req.method).toBe("PATCH");
  });

  it("el parametro de la ruta manda sobre uno igual escrito en la query", async () => {
    let seen: Record<string, unknown> | undefined;
    const routes: RouteDef[] = [
      { pattern: "profile/:rut", handler: (req) => void (seen = req.query) },
    ];

    await dispatch(
      { url: "/api/profile/11111111-1?rut=99999999-9", query: { rut: "99999999-9" } } as unknown as VercelRequest,
      fakeRes().res,
      routes,
    );

    expect(seen?.rut).toBe("11111111-1");
  });

  it("funciona aunque req.query sea una propiedad perezosa de solo lectura (como la de Vercel)", async () => {
    let seen: Record<string, unknown> | undefined;
    const routes: RouteDef[] = [
      { pattern: "game-progress/:gameId", handler: (req) => void (seen = req.query) },
    ];
    const req = { url: "/api/game-progress/color-sequence" } as Record<string, unknown>;

    Object.defineProperty(req, "query", {
      configurable: true,
      enumerable: true,
      get: () => ({ route: "x" }),
    });

    await dispatch(req as unknown as VercelRequest, fakeRes().res, routes);

    expect(seen).toEqual({ gameId: "color-sequence" });
  });

  it("devuelve lo que responde el handler (para esperar su trabajo asincrono)", async () => {
    let finished = false;
    const routes: RouteDef[] = [
      {
        pattern: "auth/me",
        handler: async () => {
          await new Promise((r) => setTimeout(r, 5));
          finished = true;
        },
      },
    ];

    await dispatch({ url: "/api/auth/me", query: {} } as unknown as VercelRequest, fakeRes().res, routes);

    expect(finished).toBe(true);
  });
});

// Vercel crea una funcion por cada archivo de api/ y el plan gratuito limita
// cuantas se pueden desplegar. Estos tests evitan volver a pasarse sin querer.
describe("una sola funcion de Vercel", () => {
  const posix = (path: string) => path.split("\\").join("/");

  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
    );

  it("api/ contiene unicamente el punto de entrada", () => {
    expect(files("api")).toEqual([join("api", "index.ts")]);
  });

  it("vercel.json reescribe /api/* hacia la funcion (un catch-all de archivo solo cubre un segmento)", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      rewrites?: { source: string; destination: string }[];
    };

    expect(config.rewrites).toContainEqual({ source: "/api/(.*)", destination: "/api" });
  });

  it("cada handler de lib/handlers esta en la tabla de rutas, y al reves", () => {
    const routerSource = readFileSync("lib/router.ts", "utf8");
    const handlers = files("lib/handlers").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

    expect(handlers).toHaveLength(ROUTES.length);

    for (const file of handlers) {
      // En Windows readdirSync devuelve "lib\\handlers\\...": se normaliza antes.
      const importPath = "./" + posix(file).replace(/^lib\//, "").replace(/\.ts$/, "");

      expect(routerSource, file).toContain(`"${importPath}"`);
    }
  });
});
