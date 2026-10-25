import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorized: true as boolean,
  owned: true as boolean,
  outcome: "saved" as "saved" | "unknown-case" | "invalid-order",
  calls: [] as { fn: string; args: unknown[] }[],
}));

vi.mock("./auth", () => ({
  requireAuth: (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => {
    if (!mocks.authorized) {
      res.status(401).json({ success: false, message: "No autenticado." });
      return null;
    }

    return { rut: "11111111-1", role: "student" };
  },
}));

vi.mock("./sessions", async () => (await import("./sessionsMock")).sessionsMock);
vi.mock("./db", () => ({ connectDB: async () => undefined }));

vi.mock("./gameAttemptsStore", () => ({
  ensureAttempt: async (...args: unknown[]) => {
    mocks.calls.push({ fn: "ensureAttempt", args });

    return mocks.owned ? { attemptNumber: 3, student: {} } : null;
  },
  saveLevelResults: async (...args: unknown[]) => {
    mocks.calls.push({ fn: "saveLevelResults", args });

    return mocks.outcome;
  },
  closeAttempt: async (...args: unknown[]) => {
    mocks.calls.push({ fn: "closeAttempt", args });
  },
}));

import handler from "./handlers/games/attempts";

const attempt = {
  attemptId: "abcdefgh12345678",
  sessionId: "sess-1234567890",
  startedAt: new Date().toISOString(),
  contentVersion: "color-sequence-1",
  device: {},
};

function result(index: number) {
  return {
    key: String(index),
    index,
    metrics: { sequenceLength: index + 1, correctCount: index + 1 },
    activeMsGross: 2000,
    activeMsNet: 1500,
    completedAt: new Date().toISOString(),
  };
}

async function call(body: unknown, options: { method?: string; gameId?: string } = {}) {
  let status = 0;
  let json: Record<string, unknown> = {};

  const res = {
    status(code: number) {
      status = code;

      return res;
    },
    json(payload: Record<string, unknown>) {
      json = payload;

      return res;
    },
  };

  await handler(
    {
      method: options.method ?? "POST",
      query: { gameId: options.gameId ?? "color-sequence" },
      headers: {},
      body,
    } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );

  return { status, json };
}

const called = (fn: string) => mocks.calls.filter((c) => c.fn === fn);

beforeEach(() => {
  mocks.authorized = true;
  mocks.owned = true;
  mocks.outcome = "saved";
  mocks.calls.length = 0;
});

describe("POST /api/game-attempts/:gameId", () => {
  it("rechaza metodos distintos de POST y usuarios sin sesion", async () => {
    expect((await call({}, { method: "GET" })).status).toBe(405);

    mocks.authorized = false;
    expect((await call({ type: "level", attempt, result: result(1) })).status).toBe(401);
  });

  it("rechaza juegos y tipos desconocidos", async () => {
    expect((await call({ type: "level", attempt, result: result(1) }, { gameId: "otro" })).status).toBe(400);
    expect((await call({ type: "raro", attempt })).status).toBe(400);
  });

  it("level: guarda un resultado", async () => {
    const out = await call({ type: "level", attempt, result: result(1) });

    expect(out.status).toBe(200);
    expect(out.json).toMatchObject({ success: true, data: { attemptNumber: 3 } });
    expect(called("saveLevelResults")).toHaveLength(1);
    expect(called("closeAttempt")).toHaveLength(0);
  });

  it("close: cierra el intento sin guardar resultados", async () => {
    const out = await call({ type: "close", attempt, status: "finished" });

    expect(out.status).toBe(200);
    expect(called("closeAttempt")).toHaveLength(1);
    expect(called("saveLevelResults")).toHaveLength(0);
  });

  it("batch: guarda todos los resultados y cierra si trae status", async () => {
    const out = await call({
      type: "batch",
      attempt,
      results: [result(1), result(2), result(3)],
      status: "finished",
    });

    expect(out.status).toBe(200);
    expect((called("saveLevelResults")[0]!.args[5] as unknown[]).length).toBe(3);
    expect(called("closeAttempt")).toHaveLength(1);
  });

  it("batch sin status no cierra", async () => {
    await call({ type: "batch", attempt, results: [result(1)] });

    expect(called("closeAttempt")).toHaveLength(0);
  });

  it("batch con solo cierre (sin resultados) es valido", async () => {
    const out = await call({ type: "batch", attempt, results: [], status: "finished" });

    expect(out.status).toBe(200);
    expect(called("saveLevelResults")).toHaveLength(0);
    expect(called("closeAttempt")).toHaveLength(1);
  });

  it("batch vacio y sin status se rechaza", async () => {
    expect((await call({ type: "batch", attempt, results: [] })).status).toBe(400);
  });

  it("batch: un resultado malo rechaza todo el lote antes de tocar la base", async () => {
    const bad = { ...result(2), metrics: { sequenceLength: 2, correctCount: 9 } };
    const out = await call({ type: "batch", attempt, results: [result(1), bad] });

    expect(out.status).toBe(400);
    expect(mocks.calls).toHaveLength(0);
  });

  it("batch: claves repetidas, no-arreglo y lotes enormes se rechazan", async () => {
    expect((await call({ type: "batch", attempt, results: [result(1), result(1)] })).status).toBe(400);
    expect((await call({ type: "batch", attempt, results: "x" })).status).toBe(400);

    const many = Array.from({ length: 101 }, (_, i) => result(i + 1));

    expect((await call({ type: "batch", attempt, results: many })).status).toBe(400);
  });

  it("batch con status invalido se rechaza", async () => {
    expect((await call({ type: "batch", attempt, results: [result(1)], status: "otro" })).status).toBe(400);
  });

  it("un intento ajeno da 403 y no guarda nada", async () => {
    mocks.owned = false;
    const out = await call({ type: "batch", attempt, results: [result(1)], status: "finished" });

    expect(out.status).toBe(403);
    expect(called("saveLevelResults")).toHaveLength(0);
    expect(called("closeAttempt")).toHaveLength(0);
  });

  it("un caso desconocido da 404 y no cierra el intento", async () => {
    mocks.outcome = "unknown-case";
    const out = await call({ type: "batch", attempt, results: [result(1)], status: "finished" });

    expect(out.status).toBe(404);
    expect(called("closeAttempt")).toHaveLength(0);
  });

  it("un orden invalido da 400 y no cierra el intento", async () => {
    mocks.outcome = "invalid-order";
    const out = await call({ type: "batch", attempt, results: [result(1)], status: "finished" });

    expect(out.status).toBe(400);
    expect(called("closeAttempt")).toHaveLength(0);
  });
});
