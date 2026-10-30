import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bulkWrite: vi.fn(async (_ops: unknown[]) => ({})),
}));

vi.mock("./models/MiniCase", () => ({ MiniCase: { bulkWrite: mocks.bulkWrite } }));

import { MINI_CASES_SEED } from "./miniCasesSeed";
import { ensureBaseMiniCases, runStartupTasks } from "./startupTasks";

type UpdateOne = { updateOne: { filter: Record<string, unknown>; update: Record<string, unknown>; upsert?: boolean } };

beforeEach(() => {
  mocks.bulkWrite.mockClear();
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
    await runStartupTasks();

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
