import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "student" as "student" | "admin",
  authorized: true as boolean,
  unlocked: false as boolean,
  accessCalls: 0,
  accessThrows: false as boolean,
  savedResults: 0,
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

    return { rut: "11111111-1", role: mocks.role };
  },
}));

vi.mock("./sessions", async () => (await import("./sessionsMock")).sessionsMock);
vi.mock("./db", () => ({ connectDB: async () => undefined }));

vi.mock("./gameUnlocksStore", () => ({
  resolveMiniCasesAccess: async () => {
    mocks.accessCalls += 1;

    if (mocks.accessThrows) throw new Error("base caida");

    return mocks.unlocked;
  },
}));

vi.mock("./models/MiniCase", () => {
  const cases = [
    {
      caseKey: "c1",
      baseText: "b",
      twistText: "t",
      promptText: "p",
      feedback: "f",
      options: ["a", "b", "c", "d"].map((k, i) => ({
        optionKey: k,
        text: k,
        correctStep: i + 1,
      })),
    },
  ];

  return {
    MiniCase: {
      find: () => ({ select: () => ({ sort: () => ({ lean: async () => cases }) }) }),
      findOne: async () => cases[0],
    },
  };
});

vi.mock("./gameAttemptsStore", () => ({
  ensureAttempt: async () => ({ attemptNumber: 1, student: {} }),
  saveLevelResults: async () => {
    mocks.savedResults += 1;

    return "saved";
  },
  closeAttempt: async () => undefined,
}));

import accessHandler from "./handlers/games/access";
import attemptsHandler from "./handlers/games/attempts";
import miniCasesHandler from "./handlers/miniCases/bank";
import submitHandler from "./handlers/miniCases/submit";

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

async function call(
  handler: Handler,
  req: { method?: string; query?: Record<string, string>; body?: unknown } = {},
) {
  let status = 0;
  let json: Record<string, any> = {};

  const res = {
    status(code: number) {
      status = code;

      return res;
    },
    json(payload: Record<string, any>) {
      json = payload;

      return res;
    },
  };

  await handler(
    { method: "GET", query: {}, headers: {}, ...req } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );

  return { status, json };
}

const attempt = {
  attemptId: "abcdefgh12345678",
  sessionId: "sess-1234567890",
  startedAt: new Date().toISOString(),
  contentVersion: "x",
  device: {},
};

function seriationResult(index: number) {
  return {
    key: String(index),
    index,
    metrics: { sequenceLength: index + 1, correctCount: index + 1 },
    activeMsGross: 1000,
    activeMsNet: 800,
    completedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  mocks.role = "student";
  mocks.authorized = true;
  mocks.unlocked = false;
  mocks.accessCalls = 0;
  mocks.accessThrows = false;
  mocks.savedResults = 0;
});

describe("GET /api/games/access", () => {
  it("solo GET y solo estudiantes con sesion", async () => {
    expect((await call(accessHandler, { method: "POST" })).status).toBe(405);

    mocks.role = "admin";
    expect((await call(accessHandler)).status).toBe(403);

    mocks.authorized = false;
    expect((await call(accessHandler)).status).toBe(401);
  });

  it("responde si Mini Casos esta desbloqueado, sin dar mas detalles", async () => {
    const locked = await call(accessHandler);
    expect(locked.status).toBe(200);
    expect(locked.json.data).toEqual({ miniCases: false });

    mocks.unlocked = true;
    expect((await call(accessHandler)).json.data).toEqual({ miniCases: true });
  });
});

describe("el servidor exige el desbloqueo de Mini Casos", () => {
  it("el banco de casos: 403 para un estudiante bloqueado, 200 desbloqueado", async () => {
    expect((await call(miniCasesHandler)).status).toBe(403);

    mocks.unlocked = true;
    const out = await call(miniCasesHandler);
    expect(out.status).toBe(200);
    expect(out.json.data).toHaveLength(1);
  });

  it("el administrador ve el banco sin desbloqueo ni consulta", async () => {
    mocks.role = "admin";
    expect((await call(miniCasesHandler)).status).toBe(200);

    expect(mocks.accessCalls).toBe(0);
  });

  it("enviar un caso: 403 bloqueado, 200 desbloqueado", async () => {
    const req = {
      method: "POST",
      query: { caseKey: "c1" },
      body: { orderedOptionKeys: ["a", "b", "c", "d"] },
    };

    expect((await call(submitHandler, req)).status).toBe(403);

    mocks.unlocked = true;
    expect((await call(submitHandler, req)).status).toBe(200);
  });

  it("registrar una partida de mini casos: 403 bloqueado y no guarda nada", async () => {
    const body = {
      type: "close",
      attempt,
      status: "finished",
    };

    const blocked = await call(attemptsHandler, {
      method: "POST",
      query: { gameId: "mini-cases" },
      body,
    });
    expect(blocked.status).toBe(403);

    mocks.unlocked = true;
    const open = await call(attemptsHandler, {
      method: "POST",
      query: { gameId: "mini-cases" },
      body,
    });
    expect(open.status).toBe(200);
  });

  it("las partidas de seriacion y nodos nunca estan bloqueadas", async () => {
    for (const gameId of ["color-sequence", "node-connection"]) {
      mocks.unlocked = false;
      const out = await call(attemptsHandler, {
        method: "POST",
        query: { gameId },
        body: { type: "close", attempt, status: "finished" },
      });

      expect(out.status).toBe(200);
    }
  });
});

describe("el desbloqueo se anota al llegar al nivel 10", () => {
  const post = (gameId: string, index: number) =>
    call(attemptsHandler, {
      method: "POST",
      query: { gameId },
      body: {
        type: "level",
        attempt,
        result:
          gameId === "node-connection"
            ? {
                ...seriationResult(index),
                metrics: { pairCount: 3, undoCount: 0, resetCount: 0 },
              }
            : seriationResult(index),
      },
    });

  it("al guardar el nivel 10 de seriacion o de nodos se evalua el desbloqueo", async () => {
    await post("color-sequence", 10);
    expect(mocks.accessCalls).toBe(1);

    await post("node-connection", 12);
    expect(mocks.accessCalls).toBe(2);
  });

  it("antes del nivel 10 no se consulta nada", async () => {
    await post("color-sequence", 9);
    await post("node-connection", 3);

    expect(mocks.accessCalls).toBe(0);
  });

  it("si anotar el desbloqueo falla, el resultado igual se guarda y responde 200", async () => {
    mocks.accessThrows = true;
    const out = await post("color-sequence", 10);

    expect(out.status).toBe(200);
    expect(mocks.savedResults).toBe(1);
  });
});
