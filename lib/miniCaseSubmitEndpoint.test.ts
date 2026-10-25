import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  alternateOrders: undefined as string[][] | undefined,
}));

vi.mock("./auth", () => ({
  requireAuth: () => ({ rut: "11111111-1", role: "student" }),
}));

vi.mock("./sessions", async () => (await import("./sessionsMock")).sessionsMock);
vi.mock("./db", () => ({ connectDB: async () => undefined }));

vi.mock("./gameUnlocksStore", () => ({
  resolveMiniCasesAccess: async () => true,
}));

vi.mock("./models/MiniCase", () => ({
  MiniCase: {
    findOne: async () => ({
      caseKey: "caso-9",
      options: ["a", "b", "c", "d"].map((k, i) => ({
        optionKey: k,
        text: k,
        correctStep: i + 1,
      })),
      alternateOrders: mocks.alternateOrders,
    }),
  },
}));

import handler from "./handlers/miniCases/submit";

async function submit(orderedOptionKeys: unknown) {
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
    {
      method: "POST",
      query: { caseKey: "caso-9" },
      headers: {},
      body: { orderedOptionKeys },
    } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );

  return { status, json };
}

beforeEach(() => {
  mocks.alternateOrders = undefined;
});

describe("POST /api/mini-cases/:caseKey/submit", () => {
  it("puntua la secuencia principal", async () => {
    const out = await submit(["a", "b", "c", "d"]);

    expect(out.status).toBe(200);
    expect(out.json.data).toEqual({ caseKey: "caso-9", correctSteps: 4, isFullyCorrect: true });
  });

  it("sin secuencia alternativa, la otra secuencia no es completa", async () => {
    const out = await submit(["c", "a", "b", "d"]);

    expect(out.json.data).toMatchObject({ correctSteps: 1, isFullyCorrect: false });
  });

  it("con la secuencia alternativa del caso 9, ambas son completas", async () => {
    mocks.alternateOrders = [["c", "a", "b", "d"]];

    expect((await submit(["a", "b", "c", "d"])).json.data).toMatchObject({ correctSteps: 4, isFullyCorrect: true });
    expect((await submit(["c", "a", "b", "d"])).json.data).toMatchObject({ correctSteps: 4, isFullyCorrect: true });
  });

  it("rechaza ordenes que no son una ordenacion de las 4 opciones", async () => {
    for (const bad of [["a", "a", "a", "a"], ["a", "b", "c", "x"], ["a", "b", "c"], "abcd", null]) {
      expect((await submit(bad)).status).toBe(400);
    }
  });

  it("la respuesta no revela la clave ni la secuencia usada", async () => {
    mocks.alternateOrders = [["c", "a", "b", "d"]];
    const out = await submit(["c", "a", "b", "d"]);

    expect(Object.keys(out.json.data).sort()).toEqual(["caseKey", "correctSteps", "isFullyCorrect"]);
  });
});
