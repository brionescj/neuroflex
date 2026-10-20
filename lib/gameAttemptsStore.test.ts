import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LevelReport } from "./gameAttempts";

// Colecciones simuladas en memoria: solo implementan lo que usa el almacen.
// No reemplazan una prueba contra MongoDB (los indices unicos reales y los
// operadores se comprueban alla), pero ejercitan la logica propia.
type Doc = Record<string, any>;

const db = vi.hoisted(() => ({
  attempts: [] as Doc[],
  results: [] as Doc[],
  cases: [] as Doc[],
  students: [] as Doc[],
}));

vi.mock("./models/GameAttempt", () => ({
  GameAttempt: {
    async findOne(filter: Doc) {
      return db.attempts.find((a) => a.attemptId === filter.attemptId) ?? null;
    },
    async countDocuments(filter: Doc) {
      return db.attempts.filter(
        (a) => a.studentRut === filter.studentRut && a.gameId === filter.gameId,
      ).length;
    },
    async create(doc: Doc) {
      const clash = db.attempts.some(
        (a) =>
          a.attemptId === doc.attemptId ||
          (a.studentRut === doc.studentRut &&
            a.gameId === doc.gameId &&
            a.attemptNumber === doc.attemptNumber),
      );

      if (clash) throw Object.assign(new Error("dup"), { code: 11000 });

      const stored = { ...doc };
      db.attempts.push(stored);

      return stored;
    },
    async updateOne(filter: Doc, update: Doc) {
      const target = db.attempts.find((a) => a.attemptId === filter.attemptId);
      if (!target) return;

      const notSession = filter["sessions.sessionId"]?.$ne;

      if (
        notSession !== undefined &&
        target.sessions.some((s: Doc) => s.sessionId === notSession)
      ) {
        return;
      }

      if (update.$push?.sessions) target.sessions.push(update.$push.sessions);
      Object.assign(target, update.$set ?? {});
    },
  },
}));

vi.mock("./models/GameLevelResult", () => ({
  GameLevelResult: {
    async updateOne(filter: Doc, update: Doc, options: Doc) {
      let row: Doc | undefined = db.results.find(
        (r) => r.attemptId === filter.attemptId && r.key === filter.key,
      );

      if (!row && options?.upsert) {
        const created: Doc = { ...filter, ...(update.$setOnInsert ?? {}) };

        db.results.push(created);
        row = created;
      }

      if (row) Object.assign(row, update.$set ?? {});
    },
    find(filter: Doc) {
      const rows = db.results.filter((r) => r.attemptId === filter.attemptId);

      return {
        sort: () => ({
          lean: async () =>
            [...rows].sort((a, b) => a.index - b.index || a.tryNumber - b.tryNumber),
        }),
      };
    },
  },
}));

vi.mock("./models/MiniCase", () => ({
  MiniCase: {
    find: () => ({ sort: () => ({ lean: async () => db.cases }) }),
    async findOne(filter: Doc) {
      return db.cases.find((c) => c.caseKey === filter.caseKey) ?? null;
    },
  },
}));

vi.mock("./models/Student", () => ({
  Student: {
    findOne: (filter: Doc) => ({
      lean: async () => db.students.find((s) => s.rut === filter.rut) ?? null,
    }),
  },
}));

import {
  closeAttempt,
  ensureAttempt,
  saveLevelResult,
  saveLevelResults,
} from "./gameAttemptsStore";

const device = {
  pointer: "touch" as const,
  viewportWidth: 390,
  viewportHeight: 800,
  pixelRatio: 2,
  platform: "Android",
  browser: "Chrome",
  timeZone: "America/Santiago",
  language: "es-CL",
};

function info(attemptId: string, sessionId = "sess-aaaaaaaa") {
  return {
    attemptId,
    sessionId,
    startedAt: new Date("2026-10-14T11:00:00.000Z"),
    contentVersion: "color-sequence-1",
    device,
  };
}

function level(index: number, overrides: Partial<LevelReport> = {}): LevelReport {
  return {
    key: String(index),
    index,
    tryNumber: 1,
    metrics: { sequenceLength: index + 1, correctCount: index + 1 },
    activeMsGross: 2000,
    activeMsNet: 1500,
    completedAt: new Date("2026-10-14T11:05:00.000Z"),
    orderedOptionKeys: null,
    ...overrides,
  };
}

beforeEach(() => {
  db.attempts.length = 0;
  db.results.length = 0;
  db.cases.length = 0;
  db.students.length = 0;
  db.students.push({
    rut: "11111111-1",
    paralelo: 2,
    entryYear: 2024,
    birthDate: "2000-01-01",
    ciudad: "Temuco",
    region: "La Araucania",
  });
});

describe("ensureAttempt", () => {
  it("crea el intento con la foto del estudiante y numero 1", async () => {
    const attempt = await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));

    expect(attempt).toMatchObject({
      attemptNumber: 1,
      status: "in_progress",
      contentVersion: "color-sequence-1",
      student: { paralelo: 2, entryYear: 2024, ageAtStart: 26, ciudad: "Temuco" },
    });
    expect(attempt?.sessions).toHaveLength(1);
  });

  it("numera los intentos del mismo estudiante y juego", async () => {
    await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));
    const second = await ensureAttempt("11111111-1", "color-sequence", info("attempt-0002"));
    const otherGame = await ensureAttempt("11111111-1", "node-connection", info("attempt-0003"));

    expect(second?.attemptNumber).toBe(2);
    expect(otherGame?.attemptNumber).toBe(1);
  });

  it("devolver el mismo intento no lo duplica", async () => {
    await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));
    await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));

    expect(db.attempts).toHaveLength(1);
  });

  it("una sesion nueva (otro equipo) se agrega una sola vez", async () => {
    await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001", "sess-aaaaaaaa"));
    await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001", "sess-bbbbbbbb"));
    await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001", "sess-bbbbbbbb"));

    expect(db.attempts[0]?.sessions.map((s: Doc) => s.sessionId)).toEqual([
      "sess-aaaaaaaa",
      "sess-bbbbbbbb",
    ]);
  });

  it("no entrega un intento ajeno ni de otro juego", async () => {
    await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));

    expect(await ensureAttempt("22222222-2", "color-sequence", info("attempt-0001"))).toBeNull();
    expect(await ensureAttempt("11111111-1", "node-connection", info("attempt-0001"))).toBeNull();
  });

  it("calcula la version del banco en mini casos (el cliente no la decide)", async () => {
    db.cases.push({ caseKey: "c1", baseText: "a", twistText: "b", promptText: "c", options: [] });

    const attempt = await ensureAttempt("11111111-1", "mini-cases", {
      ...info("attempt-0001"),
      contentVersion: "lo-que-diga-el-cliente",
    });

    expect(attempt?.contentVersion).toMatch(/^bank-[0-9a-f]{10}$/);
  });
});

describe("saveLevelResult", () => {
  it("guarda el nivel con el estudiante copiado", async () => {
    const attempt = await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));

    const outcome = await saveLevelResult(
      "11111111-1", "color-sequence", attempt!, "sess-aaaaaaaa", device, level(1),
    );

    expect(outcome).toBe("saved");
    expect(db.results[0]).toMatchObject({
      attemptId: "attempt-0001",
      studentRut: "11111111-1",
      key: "1",
      student: { entryYear: 2024 },
      activeMsNet: 1500,
    });
  });

  it("reenviar el mismo nivel lo actualiza y no lo duplica", async () => {
    const attempt = await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));

    await saveLevelResult("11111111-1", "color-sequence", attempt!, "s", device, level(1));
    await saveLevelResult(
      "11111111-1", "color-sequence", attempt!, "s", device,
      level(1, { activeMsNet: 1800 }),
    );

    expect(db.results).toHaveLength(1);
    expect(db.results[0]?.activeMsNet).toBe(1800);
  });

  it("mini casos: el puntaje lo calcula el servidor, no el navegador", async () => {
    db.cases.push({
      caseKey: "c1",
      options: ["a", "b", "c", "d"].map((k, i) => ({ optionKey: k, correctStep: i + 1 })),
    });
    const attempt = await ensureAttempt("11111111-1", "mini-cases", info("attempt-0001"));

    const outcome = await saveLevelResult(
      "11111111-1", "mini-cases", attempt!, "s", device,
      level(1, {
        key: "c1",
        // El navegador afirma 4 aciertos: se ignora.
        metrics: { correctSteps: 4, isFullyCorrect: true },
        orderedOptionKeys: ["b", "a", "c", "d"],
      }),
    );

    expect(outcome).toBe("saved");
    expect(db.results[0]?.metrics).toMatchObject({
      correctSteps: 2,
      isFullyCorrect: false,
      orderedOptionKeys: ["b", "a", "c", "d"],
    });
  });

  it("mini casos: un caso que no existe se rechaza", async () => {
    const attempt = await ensureAttempt("11111111-1", "mini-cases", info("attempt-0001"));

    const outcome = await saveLevelResult(
      "11111111-1", "mini-cases", attempt!, "s", device,
      level(1, { key: "fantasma", orderedOptionKeys: ["a", "b", "c", "d"] }),
    );

    expect(outcome).toBe("unknown-case");
    expect(db.results).toHaveLength(0);
  });
});

describe("saveLevelResults (lote)", () => {
  it("guarda varios resultados y reenviar el lote no los duplica", async () => {
    const attempt = await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));
    const batch = [level(1), level(2), level(3)];

    expect(
      await saveLevelResults("11111111-1", "color-sequence", attempt!, "s", device, batch),
    ).toBe("saved");
    await saveLevelResults("11111111-1", "color-sequence", attempt!, "s", device, batch);

    expect(db.results.map((r) => r.key).sort()).toEqual(["1", "2", "3"]);
  });

  it("actualiza la actividad del intento", async () => {
    const attempt = await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));
    db.attempts[0]!.lastActivityAt = new Date(0);

    await saveLevelResults("11111111-1", "color-sequence", attempt!, "s", device, [level(1)]);

    expect((db.attempts[0]!.lastActivityAt as Date).getTime()).toBeGreaterThan(0);
  });

  it("mini casos: si un caso no existe lo avisa, y guarda los demas", async () => {
    db.cases.push({
      caseKey: "c1",
      options: ["a", "b", "c", "d"].map((k, i) => ({ optionKey: k, correctStep: i + 1 })),
    });
    const attempt = await ensureAttempt("11111111-1", "mini-cases", info("attempt-0001"));
    const keys = ["a", "b", "c", "d"];

    const outcome = await saveLevelResults(
      "11111111-1", "mini-cases", attempt!, "s", device,
      [
        level(1, { key: "c1", orderedOptionKeys: keys }),
        level(2, { key: "fantasma", orderedOptionKeys: keys }),
      ],
    );

    expect(outcome).toBe("unknown-case");
    expect(db.results.map((r) => r.key)).toEqual(["c1"]);
  });
});

describe("closeAttempt", () => {
  it("recalcula el resumen desde lo guardado y marca el cierre", async () => {
    const attempt = await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));

    await saveLevelResult("11111111-1", "color-sequence", attempt!, "s", device, level(1));
    await saveLevelResult("11111111-1", "color-sequence", attempt!, "s", device, level(2));

    const summary = await closeAttempt("color-sequence", attempt!, "finished");

    expect(summary).toMatchObject({ levelsReported: 2, maxLevel: 2, activeMsNet: 3000 });
    expect(db.attempts[0]).toMatchObject({ status: "finished", summary });
    expect(db.attempts[0]?.finishedAt).toBeInstanceOf(Date);
  });

  it("cerrar dos veces no mueve la hora de termino", async () => {
    const attempt = await ensureAttempt("11111111-1", "color-sequence", info("attempt-0001"));

    await closeAttempt("color-sequence", attempt!, "finished");
    const first = db.attempts[0]!.finishedAt as Date;

    await new Promise((resolve) => setTimeout(resolve, 5));
    await closeAttempt("color-sequence", db.attempts[0] as never, "finished");

    expect((db.attempts[0]!.finishedAt as Date).getTime()).toBe(first.getTime());
  });
});
