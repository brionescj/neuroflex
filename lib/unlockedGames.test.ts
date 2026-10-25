import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ record: null as object | null, queries: [] as unknown[] }));

vi.mock("./models/GameUnlock", () => ({
  GameUnlock: {
    findOne: (filter: unknown) => {
      state.queries.push(filter);

      return { select: () => ({ lean: async () => state.record }) };
    },
  },
}));

import { findUnlockedGames } from "./unlockedGames";

beforeEach(() => {
  state.record = null;
  state.queries = [];
});

describe("findUnlockedGames", () => {
  it("un estudiante con Mini casos ya registrado lo trae desbloqueado", async () => {
    state.record = { _id: "x" };

    await expect(findUnlockedGames("12345678-5", "student")).resolves.toEqual({ miniCases: true });
    expect(state.queries).toEqual([{ studentRut: "12345678-5", gameId: "mini-cases" }]);
  });

  it("sin registro no adelanta nada (se consulta como siempre)", async () => {
    await expect(findUnlockedGames("12345678-5", "student")).resolves.toBeUndefined();
  });

  it("un administrador no consulta nada", async () => {
    await expect(findUnlockedGames("99999999-9", "admin")).resolves.toBeUndefined();
    expect(state.queries).toEqual([]);
  });
});
