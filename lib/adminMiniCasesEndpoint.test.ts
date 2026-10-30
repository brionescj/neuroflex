import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Stored = Record<string, any>;

const mocks = vi.hoisted(() => ({ cases: [] as Stored[] }));

vi.mock("./auth", () => ({
  requireAuth: () => ({ rut: "1-9", role: "admin" }),
}));
vi.mock("./sessions", async () => (await import("./sessionsMock")).sessionsMock);
vi.mock("./db", () => ({ connectDB: async () => undefined }));
vi.mock("./gameUnlocksStore", () => ({ resolveMiniCasesAccess: async () => true }));

vi.mock("./models/MiniCase", () => {
  const chain = (rows: Stored[]) => ({
    select: () => chain(rows),
    sort: () => chain(rows),
    lean: async () => rows,
    then: (resolve: (value: Stored[]) => void) => resolve(rows),
  });

  return {
    MiniCase: {
      find: () => chain(mocks.cases),
      findOne: (query: { caseKey: string }) => ({
        lean: async () => mocks.cases.find((c) => c.caseKey === query.caseKey) ?? null,
      }),
      findOneAndUpdate: async (query: { caseKey: string }, update: Stored) => {
        const index = mocks.cases.findIndex((c) => c.caseKey === query.caseKey);
        const next = { ...(mocks.cases[index] ?? {}), ...update };

        if (index >= 0) mocks.cases[index] = next;
        else mocks.cases.push(next);

        return next;
      },
    },
  };
});

import adminHandler from "./handlers/admin/miniCases";
import bankHandler from "./handlers/miniCases/bank";

async function call(handler: typeof adminHandler, method: string, body?: unknown) {
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

  await handler({ method, headers: {}, body } as unknown as VercelRequest, res as unknown as VercelResponse);

  return { status, json };
}

const body = {
  title: "Área de Lenguaje y Comunicación",
  imageKey: "biblioteca",
  baseText: "Un caso.",
  twistText: "¡Alerta de Cambio! Algo cambia.",
  promptText: "Ordena del 1 al 4:",
  feedback: "Porque sí.",
  options: [
    { text: "Primero", correctStep: 1 },
    { text: "Segundo", correctStep: 2 },
    { text: "Tercero", correctStep: 3 },
    { text: "Cuarto", correctStep: 4 },
  ],
};

beforeEach(() => {
  mocks.cases = [];
});

describe("POST /api/admin/mini-cases", () => {
  it("un caso nuevo toma el siguiente número y claves de alternativa propias", async () => {
    mocks.cases = [{ caseKey: "caso-10", options: [] }];

    const out = await call(adminHandler, "POST", body);

    expect(out.status).toBe(200);
    expect(out.json.data.caseKey).toBe("caso-11");
    expect(out.json.data.imageKey).toBe("biblioteca");
    expect(out.json.data.options.map((o: Stored) => o.optionKey)).toEqual([
      "caso-11-a",
      "caso-11-b",
      "caso-11-c",
      "caso-11-d",
    ]);
  });

  it("al editar conserva las claves y las secuencias alternativas", async () => {
    mocks.cases = [
      {
        caseKey: "caso-9",
        imageKey: "mesa-equipo",
        alternateOrders: [["caso-9-b", "caso-9-a", "caso-9-c", "caso-9-d"]],
        options: ["a", "b", "c", "d"].map((k, i) => ({ optionKey: `caso-9-${k}`, text: k, correctStep: i + 1 })),
      },
    ];

    const out = await call(adminHandler, "POST", {
      ...body,
      caseKey: "caso-9",
      imageKey: undefined,
      options: body.options.map((o, i) => ({ ...o, optionKey: `caso-9-${"abcd"[i]}` })),
    });

    expect(out.status).toBe(200);
    expect(out.json.message).toBe("Mini caso actualizado.");
    expect(out.json.data.alternateOrders).toHaveLength(1);
    expect(out.json.data.imageKey).toBe("mesa-equipo");
    expect(out.json.data.title).toBe("Área de Lenguaje y Comunicación");
  });

  it("no deja reemplazar las claves de un caso existente", async () => {
    mocks.cases = [
      {
        caseKey: "caso-9",
        options: ["a", "b", "c", "d"].map((k, i) => ({ optionKey: `caso-9-${k}`, text: k, correctStep: i + 1 })),
      },
    ];

    const out = await call(adminHandler, "POST", {
      ...body,
      caseKey: "caso-9",
      options: body.options.map((o, i) => ({ ...o, optionKey: `otra-${i}` })),
    });

    expect(out.status).toBe(400);
  });

  it("rechaza una imagen que no está en la galería", async () => {
    const out = await call(adminHandler, "POST", { ...body, imageKey: "pez" });

    expect(out.status).toBe(400);
    expect(mocks.cases).toHaveLength(0);
  });

  it("no hay forma de retirar un caso del juego: «enabled» se ignora", async () => {
    const created = await call(adminHandler, "POST", body);
    const out = await call(adminHandler, "POST", {
      ...body,
      caseKey: created.json.data.caseKey,
      options: created.json.data.options,
      enabled: false,
    });

    expect(out.status).toBe(200);
    expect(out.json.data).not.toHaveProperty("enabled");
  });
});

describe("GET /api/mini-cases", () => {
  it("entrega título e imagen, nunca el lugar correcto, y usa una imagen por defecto", async () => {
    mocks.cases = [
      {
        caseKey: "caso-1",
        title: "Área de Lenguaje",
        imageKey: "lupa",
        baseText: "b",
        twistText: "t",
        promptText: "p",
        feedback: "f",
        options: [{ optionKey: "x", text: "x", correctStep: 1 }],
      },
      {
        caseKey: "caso-2",
        title: "Otra",
        baseText: "b",
        twistText: "t",
        promptText: "p",
        feedback: "f",
        options: [{ optionKey: "y", text: "y", correctStep: 1 }],
      },
    ];

    const out = await call(bankHandler, "GET");
    const byKey = Object.fromEntries(out.json.data.map((c: Stored) => [c.caseKey, c]));

    expect(byKey["caso-1"].title).toBe("Área de Lenguaje");
    expect(byKey["caso-1"].imageKey).toBe("lupa");
    expect(byKey["caso-2"].imageKey).toBe("aula");
    expect(JSON.stringify(out.json)).not.toContain("correctStep");
  });
});
