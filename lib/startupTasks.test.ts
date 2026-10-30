import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bulkWrite: vi.fn(async (_ops: unknown[]) => ({})),
  students: [] as Record<string, unknown>[],
  studentOps: [] as { updateOne: { filter: unknown; update: Record<string, unknown> } }[],
  attemptUpdates: [] as unknown[][],
}));

vi.mock("./models/MiniCase", () => ({ MiniCase: { bulkWrite: mocks.bulkWrite } }));
vi.mock("./models/Student", () => ({
  Student: {
    collection: {
      find: () => ({ toArray: async () => mocks.students }),
      bulkWrite: async (ops: typeof mocks.studentOps) => {
        mocks.studentOps = ops;
      },
    },
  },
}));
vi.mock("./models/GameAttempt", () => ({
  GameAttempt: {
    collection: {
      updateMany: async (...args: unknown[]) => {
        mocks.attemptUpdates.push(args);
      },
    },
  },
}));

import { MINI_CASES_SEED } from "./miniCasesSeed";
import { ensureBaseMiniCases, renameCityToCommune } from "./startupTasks";

type UpdateOne = { updateOne: { filter: Record<string, unknown>; update: Record<string, unknown>; upsert?: boolean } };

beforeEach(() => {
  mocks.bulkWrite.mockClear();
  mocks.students = [];
  mocks.studentOps = [];
  mocks.attemptUpdates = [];
});

describe("carga automática del banco de mini casos", () => {
  it("agrega los 25 casos solo si faltan: upsert con $setOnInsert, nunca $set", async () => {
    await ensureBaseMiniCases();

    const inserts = mocks.bulkWrite.mock.calls[0]?.[0] as UpdateOne[];

    expect(inserts).toHaveLength(25);

    for (const [index, op] of inserts.entries()) {
      expect(op.updateOne.upsert).toBe(true);
      expect(op.updateOne.filter).toEqual({ caseKey: MINI_CASES_SEED[index]?.caseKey });
      expect(Object.keys(op.updateOne.update)).toEqual(["$setOnInsert"]);
    }
  });

  it("no hay opción de retirar casos: ningún caso lleva «enabled»", async () => {
    await ensureBaseMiniCases();

    expect(JSON.stringify(mocks.bulkWrite.mock.calls)).not.toContain("enabled");
  });

  it("solo reemplaza títulos provisorios, vacíos o con «Mini Caso»; uno corregido a mano se respeta", async () => {
    await ensureBaseMiniCases();

    const fixes = mocks.bulkWrite.mock.calls[1]?.[0] as UpdateOne[];
    const titleFix = fixes.find((op) => "$or" in op.updateOne.filter && JSON.stringify(op.updateOne.filter).includes("title"));

    expect(titleFix).toBeDefined();
    expect(JSON.stringify(titleFix?.updateOne.filter)).toContain("Área de Lectoescritura Inicial y Detección Pedagógica");
    expect(titleFix?.updateOne.update).toEqual({ $set: { title: MINI_CASES_SEED[0]?.title } });
  });

  it("pone la imagen solo a los casos que no tienen", async () => {
    await ensureBaseMiniCases();

    const fixes = mocks.bulkWrite.mock.calls[1]?.[0] as UpdateOne[];
    const imageFixes = fixes.filter((op) => JSON.stringify(op.updateOne.update).includes("imageKey"));

    expect(imageFixes).toHaveLength(25);
    expect(JSON.stringify(imageFixes[0]?.updateOne.filter)).toContain('"imageKey":{"$exists":false}');
  });
});

describe("migración de «ciudad» a «comuna»", () => {
  it("mueve la ciudad de cada ficha a «comuna» con su nombre oficial y borra «ciudad»", async () => {
    mocks.students = [
      { _id: "a", ciudad: "los angeles", region: "Biobio" },
      { _id: "b", ciudad: " Temuco ", region: "La Araucanía" },
    ];

    await renameCityToCommune();

    expect(mocks.studentOps.map((op) => op.updateOne.update)).toEqual([
      { $set: { region: "Biobío", comuna: "Los Ángeles" }, $unset: { ciudad: "" } },
      { $set: { comuna: "Temuco" }, $unset: { ciudad: "" } },
    ]);
  });

  it("una ciudad que no es comuna de su región se conserva tal cual, y sin región también", async () => {
    mocks.students = [
      { _id: "a", ciudad: "Concepción", region: "La Araucanía" },
      { _id: "b", ciudad: "Santiago" },
    ];

    await renameCityToCommune();

    expect(mocks.studentOps.map((op) => op.updateOne.update)).toEqual([
      { $set: { comuna: "Concepción" }, $unset: { ciudad: "" } },
      { $set: { comuna: "Santiago" }, $unset: { ciudad: "" } },
    ]);
  });

  it("no pisa una comuna que la ficha ya tenía", async () => {
    mocks.students = [{ _id: "a", ciudad: "Temuco", comuna: "Padre Las Casas", region: "La Araucanía" }];

    await renameCityToCommune();

    expect(mocks.studentOps[0]?.updateOne.update).toEqual({ $unset: { ciudad: "" } });
  });

  it("renombra la copia del estudiante que guarda cada partida", async () => {
    await renameCityToCommune();

    expect(mocks.attemptUpdates).toEqual([
      [{ "student.ciudad": { $exists: true } }, { $rename: { "student.ciudad": "student.comuna" } }],
    ]);
  });
});
