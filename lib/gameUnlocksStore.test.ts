import { beforeEach, describe, expect, it, vi } from "vitest";

// Colecciones simuladas en memoria (los operadores reales se comprueban en
// MongoDB; aqui se ejercita la logica propia).
type Doc = Record<string, any>;

const db = vi.hoisted(() => ({
  results: [] as Doc[],
  unlocks: [] as Doc[],
  failNextUpsertWithDuplicate: false,
  upserts: 0,
}));

vi.mock("./models/GameLevelResult", () => {
  const match = (r: Doc, filter: Doc) =>
    r.studentRut === filter.studentRut &&
    r.gameId === filter.gameId &&
    r.index >= filter.index.$gte;

  return {
    GameLevelResult: {
      find: (filter: Doc) => ({
        lean: async () => db.results.filter((r) => match(r, filter)),
      }),
      findOne: (filter: Doc) => ({
        sort: () => ({
          lean: async () =>
            db.results
              .filter((r) => match(r, filter))
              .sort((a, b) => b.index - a.index)[0] ?? null,
        }),
      }),
    },
  };
});

vi.mock("./models/GameUnlock", () => ({
  GameUnlock: {
    findOne: (filter: Doc) => ({
      lean: async () =>
        db.unlocks.find(
          (u) => u.studentRut === filter.studentRut && u.gameId === filter.gameId,
        ) ?? null,
    }),
    async updateOne(filter: Doc, update: Doc) {
      db.upserts += 1;

      if (db.failNextUpsertWithDuplicate) {
        db.failNextUpsertWithDuplicate = false;
        db.unlocks.push({ ...filter, ...update.$setOnInsert, source: "otra-solicitud" });

        throw Object.assign(new Error("dup"), { code: 11000 });
      }

      const exists = db.unlocks.some(
        (u) => u.studentRut === filter.studentRut && u.gameId === filter.gameId,
      );

      if (!exists) db.unlocks.push({ ...filter, ...update.$setOnInsert });
    },
  },
}));

import { collectMiniCasesEvidence, resolveMiniCasesAccess } from "./gameUnlocksStore";

const RUT = "11111111-1";

function seriation(index: number, passed: boolean | undefined, rut = RUT): Doc {
  const length = index + 1;

  return {
    studentRut: rut,
    gameId: "color-sequence",
    index,
    metrics:
      passed === undefined
        ? { sequenceLength: length, correctCount: length }
        : { sequenceLength: length, correctCount: passed ? length : 0, passed },
  };
}

function node(index: number, rut = RUT): Doc {
  return { studentRut: rut, gameId: "node-connection", index, metrics: {} };
}

beforeEach(() => {
  db.results.length = 0;
  db.unlocks.length = 0;
  db.failNextUpsertWithDuplicate = false;
  db.upserts = 0;
});

describe("collectMiniCasesEvidence", () => {
  it("sin partidas todo es 0", async () => {
    expect(await collectMiniCasesEvidence(RUT)).toEqual({
      colorSequenceMaxLevelPassed: 0,
      nodeMaxLevelPassed: 0,
    });
  });

  it("toma el nivel mas alto aprobado de seriacion y completado de nodos", async () => {
    db.results.push(seriation(10, true), seriation(12, true), seriation(13, false), node(10), node(15));

    expect(await collectMiniCasesEvidence(RUT)).toEqual({
      colorSequenceMaxLevelPassed: 12,
      nodeMaxLevelPassed: 15,
    });
  });

  it("un nivel 10 de seriacion no aprobado no cuenta", async () => {
    db.results.push(seriation(10, false), node(10));

    expect((await collectMiniCasesEvidence(RUT)).colorSequenceMaxLevelPassed).toBe(0);
  });

  it("un resultado antiguo sin 'passed' se evalua con los umbrales", async () => {
    // 11 de 11 en el nivel 10: pasa. 5 de 11: no pasa.
    db.results.push(seriation(10, undefined));
    expect((await collectMiniCasesEvidence(RUT)).colorSequenceMaxLevelPassed).toBe(10);

    db.results.length = 0;
    db.results.push({ ...seriation(10, undefined), metrics: { sequenceLength: 11, correctCount: 5 } });
    expect((await collectMiniCasesEvidence(RUT)).colorSequenceMaxLevelPassed).toBe(0);
  });

  it("no mezcla a otros estudiantes", async () => {
    db.results.push(seriation(10, true, "22222222-2"), node(10, "22222222-2"));

    expect(await collectMiniCasesEvidence(RUT)).toEqual({
      colorSequenceMaxLevelPassed: 0,
      nodeMaxLevelPassed: 0,
    });
  });
});

describe("resolveMiniCasesAccess", () => {
  it("bloqueado mientras falte un juego, sin crear registro", async () => {
    db.results.push(seriation(10, true));
    expect(await resolveMiniCasesAccess(RUT)).toBe(false);

    db.results.length = 0;
    db.results.push(node(10));
    expect(await resolveMiniCasesAccess(RUT)).toBe(false);

    expect(db.unlocks).toHaveLength(0);
  });

  it("nivel 9 en un juego no desbloquea", async () => {
    db.results.push(seriation(10, true), node(9));

    expect(await resolveMiniCasesAccess(RUT)).toBe(false);
  });

  it("al cumplir la regla desbloquea y deja registro con fecha, regla y evidencia", async () => {
    db.results.push(seriation(10, true), node(10));

    expect(await resolveMiniCasesAccess(RUT)).toBe(true);
    expect(db.unlocks).toHaveLength(1);
    expect(db.unlocks[0]).toMatchObject({
      studentRut: RUT,
      gameId: "mini-cases",
      source: "rule",
      rule: "mini-cases-v2",
      evidence: { colorSequenceMaxLevelPassed: 10, nodeMaxLevelPassed: 10 },
    });
    expect(db.unlocks[0]?.unlockedAt).toBeInstanceOf(Date);
  });

  it("puede lograrse en partidas y momentos distintos", async () => {
    db.results.push(node(10));
    expect(await resolveMiniCasesAccess(RUT)).toBe(false);

    db.results.push(seriation(10, true));
    expect(await resolveMiniCasesAccess(RUT)).toBe(true);
  });

  it("una vez desbloqueado NO se vuelve a bloquear aunque cambien los resultados", async () => {
    db.results.push(seriation(10, true), node(10));
    expect(await resolveMiniCasesAccess(RUT)).toBe(true);

    // Se juega de nuevo y se pierde antes del nivel 10 (o se borra todo).
    db.results.length = 0;
    db.results.push(seriation(3, false), node(2));
    expect(await resolveMiniCasesAccess(RUT)).toBe(true);

    db.results.length = 0;
    expect(await resolveMiniCasesAccess(RUT)).toBe(true);
  });

  it("consultas repetidas no crean registros nuevos ni cambian la fecha", async () => {
    db.results.push(seriation(10, true), node(10));

    await resolveMiniCasesAccess(RUT);
    const firstDate = db.unlocks[0]?.unlockedAt;
    await resolveMiniCasesAccess(RUT);
    await resolveMiniCasesAccess(RUT);

    expect(db.unlocks).toHaveLength(1);
    expect(db.unlocks[0]?.unlockedAt).toBe(firstDate);
    expect(db.upserts).toBe(1);
  });

  it("si otra solicitud lo registra a la vez, responde que si sin fallar", async () => {
    db.results.push(seriation(10, true), node(10));
    db.failNextUpsertWithDuplicate = true;

    expect(await resolveMiniCasesAccess(RUT)).toBe(true);
    expect(db.unlocks).toHaveLength(1);
  });

  it("cada estudiante tiene su propio desbloqueo", async () => {
    db.results.push(seriation(10, true), node(10));

    expect(await resolveMiniCasesAccess(RUT)).toBe(true);
    expect(await resolveMiniCasesAccess("22222222-2")).toBe(false);
  });
});
