import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as "student" | "teacher" | "admin",
  authorized: true as boolean,
  connects: 0,
  students: [] as unknown[],
  attempts: [] as unknown[],
  results: [] as unknown[],
  cases: [] as unknown[],
  filters: {} as Record<string, unknown>,
  selects: {} as Record<string, unknown>,
}));

vi.mock("./auth", () => ({
  requireAuth: (
    _req: unknown,
    res: { status: (n: number) => { json: (b: unknown) => void } },
    roles?: string[],
  ) => {
    if (!mocks.authorized) {
      res.status(401).json({ success: false, message: "No autenticado." });
      return null;
    }

    if (roles && !roles.includes(mocks.role)) {
      res.status(403).json({ success: false, message: "No autorizado." });
      return null;
    }

    return { rut: "99999999-9", role: mocks.role };
  },
}));

vi.mock("./db", () => ({
  connectDB: async () => {
    mocks.connects += 1;
  },
}));

function model(name: string, rows: () => unknown[]) {
  return {
    find: (filter: unknown = {}) => {
      mocks.filters[name] = filter;

      return {
        select: (fields: unknown) => {
          mocks.selects[name] = fields;

          return { lean: async () => rows() };
        },
      };
    },
  };
}

vi.mock("./models/Student", () => ({ Student: model("Student", () => mocks.students) }));
vi.mock("./models/GameAttempt", () => ({ GameAttempt: model("GameAttempt", () => mocks.attempts) }));
vi.mock("./models/GameLevelResult", () => ({
  GameLevelResult: model("GameLevelResult", () => mocks.results),
}));
vi.mock("./models/MiniCase", () => ({ MiniCase: model("MiniCase", () => mocks.cases) }));

import catalogHandler from "./handlers/admin/statsCatalog";
import chartHandler from "./handlers/admin/statsChart";

type Handler = typeof catalogHandler;

function call(handler: Handler, query: Record<string, unknown> = {}, method = "GET") {
  let status = 0;
  let json: Record<string, any> = {};

  const res = {
    status(code: number) {
      status = code;

      return this;
    },
    json(payload: Record<string, unknown>) {
      json = payload;

      return this;
    },
  } as unknown as VercelResponse;

  const req = { method, query, headers: {} } as unknown as VercelRequest;

  return Promise.resolve(handler(req, res)).then(() => ({ status, json }));
}

const RUT = "12345678-5";

beforeEach(() => {
  mocks.role = "admin";
  mocks.authorized = true;
  mocks.connects = 0;
  mocks.filters = {};
  mocks.selects = {};
  mocks.cases = [];
  mocks.students = [
    { rut: RUT, firstName: "Ana María", paternalLastName: "Soto", maternalLastName: "Pérez", paralelo: 1, enabled: true },
  ];
  mocks.attempts = [
    {
      attemptId: "att-1-aaaa",
      studentRut: RUT,
      gameId: "color-sequence",
      attemptNumber: 1,
      status: "finished",
      startedAt: new Date("2026-10-10T12:00:00Z"),
      lastActivityAt: new Date("2026-10-10T13:00:00Z"),
      contentVersion: "color-sequence-2",
    },
  ];
  mocks.results = [
    {
      attemptId: "att-1-aaaa",
      studentRut: RUT,
      gameId: "color-sequence",
      key: "1.1",
      index: 1,
      tryNumber: 1,
      activeMsNet: 10_000,
      completedAt: new Date("2026-10-10T12:30:00Z"),
      metrics: { passed: true, correctCount: 2, sequenceLength: 2 },
    },
  ];
});

describe.each([
  ["admin/stats/catalog", catalogHandler, {}],
  ["admin/stats/chart", chartHandler, { chart: "cs-max-level" }],
])("%s: acceso", (_name, handler, query) => {
  it("solo admin", async () => {
    mocks.role = "student";
    expect((await call(handler, query)).status).toBe(403);

    mocks.role = "teacher";
    expect((await call(handler, query)).status).toBe(403);

    mocks.authorized = false;
    expect((await call(handler, query)).status).toBe(401);
    expect(mocks.connects).toBe(0);
  });

  it("solo GET", async () => {
    expect((await call(handler, query, "POST")).status).toBe(405);
    expect((await call(handler, query, "DELETE")).status).toBe(405);
  });
});

describe("GET admin/stats/catalog", () => {
  it("entrega juegos, graficos con explicacion, filtros, períodos y estudiantes habilitados", async () => {
    const { status, json } = await call(catalogHandler);

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.games.map((g: { id: string }) => g.id)).toEqual([
      "general",
      "color-sequence",
      "node-connection",
      "mini-cases",
    ]);

    const seriation = json.data.games.find((g: { id: string }) => g.id === "color-sequence");

    expect(seriation.charts.map((c: { id: string }) => c.id)).toEqual([
      "cs-max-level",
      "cs-pass-rate",
      "cs-time",
    ]);
    expect(seriation.charts[0].blurb.length).toBeGreaterThan(40);
    expect(json.data).not.toHaveProperty("versions");
    expect(JSON.stringify(json.data)).not.toMatch(/ersi[oó]n|usesVersion/);
    expect(json.data.periods.map((p: { value: string }) => p.value)).toEqual([
      "all", "3d", "7d", "30d", "week", "month",
    ]);
    expect(json.data.countBy.map((p: { label: string }) => p.label)).toEqual(["Estudiantes", "Contar partidas"]);
    expect(
      json.data.filters.find((f: { id: string }) => f.id === "device").options.map((o: { label: string }) => o.label),
    ).toEqual(["Celular", "Tableta", "Computador"]);
    expect(seriation.charts[0].supportsDevice).toBe(true);
    expect(json.data.students).toEqual([{ rut: RUT, name: "Ana Soto Pérez", paralelo: 1 }]);
    // Solo se ofrece el paralelo que existe, y nunca "Sin dato".
    const paralelo = json.data.filters.find((f: { id: string }) => f.id === "paralelo");

    expect(paralelo.options).toEqual([{ value: "1", label: "Paralelo 1" }]);
    expect(JSON.stringify(json.data.filters)).not.toContain("Sin dato");
    expect(json.data.ageLimits).toEqual({ min: 17, max: 80 });
    expect(json.data.maxComparedStudents).toBe(6);
  });

  it("no manda datos sensibles de los estudiantes mas alla de nombre, RUT y paralelo", async () => {
    mocks.students = [
      {
        rut: RUT,
        firstName: "Ana",
        paternalLastName: "Soto",
        email: "ana@uvm.cl",
        celular: "+56911111111",
        birthDate: "2001-01-01",
        paralelo: 2,
      },
    ];

    const text = JSON.stringify((await call(catalogHandler)).json);

    expect(text).not.toContain("ana@uvm.cl");
    expect(text).not.toContain("+56911111111");
    expect(text).not.toContain("2001-01-01");
  });
});

describe("GET admin/stats/chart", () => {
  it("calcula el grafico pedido", async () => {
    const { status, json } = await call(chartHandler, {
      chart: "cs-max-level",
      options: '{"as":"count"}',
    });

    expect(status).toBe(200);
    expect(json.data.chart).toBe("cs-max-level");
    expect(json.data.categories).toEqual(["0", "1"]);
    expect(json.data.series[0].values).toEqual([0, 1]);
  });

  it("rechaza parametros invalidos sin tocar la base", async () => {
    const bad = await call(chartHandler, { chart: "nope" });

    expect(bad.status).toBe(400);
    expect(bad.json.message).toMatch(/no existe/);
    expect(mocks.connects).toBe(0);

    expect((await call(chartHandler, { chart: "cs-time", filters: "{" })).status).toBe(400);
  });

  it("solo lee los datos del juego del grafico y las metricas que usa", async () => {
    await call(chartHandler, { chart: "cs-max-level" });

    expect(mocks.filters.GameAttempt).toEqual({ gameId: "color-sequence" });
    expect(mocks.filters.GameLevelResult).toEqual({ gameId: "color-sequence" });

    const projection = mocks.selects.GameLevelResult as Record<string, 1>;

    expect(projection["metrics.passed"]).toBe(1);
    expect(projection["metrics.correctCount"]).toBe(1);
    // Los eventos finos pesan mucho y aqui no se usan.
    expect(Object.keys(projection).some((k) => k.startsWith("events"))).toBe(false);
    expect(projection.metrics).toBeUndefined();
  });

  it("los graficos generales no cargan resultados si no los necesitan", async () => {
    await call(chartHandler, { chart: "participation" });

    expect(mocks.filters.GameLevelResult).toBeUndefined();

    await call(chartHandler, { chart: "abandonment" });

    expect(mocks.filters.GameLevelResult).toBeUndefined();
  });

  it("mini casos: trae los titulos del banco", async () => {
    mocks.cases = [{ caseKey: "caso-a", title: "El semáforo" }];
    mocks.attempts = [
      {
        attemptId: "att-mc-aaaa",
        studentRut: RUT,
        gameId: "mini-cases",
        attemptNumber: 1,
        status: "finished",
        startedAt: new Date("2026-10-10T12:00:00Z"),
        lastActivityAt: new Date("2026-10-10T13:00:00Z"),
        contentVersion: "mini-cases",
      },
    ];
    mocks.results = [
      {
        attemptId: "att-mc-aaaa",
        studentRut: RUT,
        gameId: "mini-cases",
        key: "caso-a",
        index: 1,
        tryNumber: 1,
        activeMsNet: 8000,
        completedAt: new Date("2026-10-10T12:30:00Z"),
        metrics: { correctSteps: 4, isFullyCorrect: true },
      },
    ];

    const { json } = await call(chartHandler, { chart: "mc-steps" });

    expect(json.data.categories).toEqual(["El semáforo"]);
    expect(json.data.series[0].values).toEqual([4]);
  });

  it("un resultado sin metricas (nodos) no rompe el calculo", async () => {
    mocks.attempts = [
      {
        attemptId: "att-nc-aaaa",
        studentRut: RUT,
        gameId: "node-connection",
        attemptNumber: 1,
        status: "finished",
        startedAt: new Date("2026-10-10T12:00:00Z"),
        lastActivityAt: new Date("2026-10-10T13:00:00Z"),
        contentVersion: "nodes-1",
      },
    ];
    mocks.results = [
      {
        attemptId: "att-nc-aaaa",
        studentRut: RUT,
        gameId: "node-connection",
        key: "1",
        index: 1,
        tryNumber: 1,
        activeMsNet: 5000,
        completedAt: new Date("2026-10-10T12:30:00Z"),
      },
    ];

    const { status, json } = await call(chartHandler, { chart: "nc-time" });

    expect(status).toBe(200);
    expect(json.data.series[0].values).toEqual([5]);
  });
});
