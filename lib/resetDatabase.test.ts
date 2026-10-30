import { describe, expect, it, vi } from "vitest";

import { parseNameChanges } from "./personName";
import {
  KEEP_COLLECTIONS,
  buildSeedAccounts,
  checkPassword,
  resetDatabase,
  splitCollections,
  type DbLike,
} from "./resetDatabase";

const NOW = new Date(2026, 9, 30);

function fakeDb(data: Record<string, Record<string, unknown>[]>) {
  const state: Record<string, Record<string, unknown>[]> = structuredClone(data);
  const calls: string[] = [];

  const db: DbLike = {
    listCollections: () => ({ toArray: async () => Object.keys(state).map((name) => ({ name })) }),
    collection: (name) => ({
      find: () => ({ toArray: async () => [...(state[name] ?? [])] }),
      deleteMany: async () => {
        const count = state[name]?.length ?? 0;

        state[name] = [];
        calls.push(`deleteMany ${name}`);

        return { deletedCount: count };
      },
      insertMany: async (docs) => {
        state[name] = [...(state[name] ?? []), ...docs];
        calls.push(`insertMany ${name}`);
      },
    }),
  };

  return { db, state, calls };
}

describe("buildSeedAccounts", () => {
  const { admin, student } = buildSeedAccounts(NOW);

  it("el administrador: nombres normalizados, RUT con guion y correo", () => {
    expect(admin.profile).toEqual({
      rut: "18299618-1",
      firstName: "Camilo Jaime",
      paternalLastName: "Briones",
      maternalLastName: "Quezada",
      email: "brionescamiloj@gmail.com",
      enabled: true,
      avatarId: "panda",
    });
    expect(admin.account).toEqual({ rut: "18299618-1", role: "admin", enabled: true });
  });

  it("el estudiante de prueba: ficha completa, ya registrada, con la comuna oficial", () => {
    expect(student.profile).toEqual({
      rut: "99999999-9",
      firstName: "Estudiante",
      paternalLastName: "De Prueba",
      maternalLastName: "Neuroflex",
      email: "estudiante@neuroflex.cl",
      celular: "99999999",
      gender: "undisclosed",
      studyShift: "day",
      birthDate: "2000-01-01",
      university: "uvm",
      region: "Valparaíso",
      comuna: "Viña del Mar",
      paralelo: 1,
      entryYear: 2026,
      enabled: true,
      registered: true,
      avatarId: "cat",
      isDeleted: false,
    });
    expect(student.account).toEqual({ rut: "99999999-9", role: "student", enabled: true });
  });

  it("los nombres cumplen la regla del sistema", () => {
    expect(parseNameChanges(student.profile).ok).toBe(true);
  });
});

describe("checkPassword", () => {
  it("acepta una que cumple las reglas y rechaza una débil", () => {
    expect(() => checkPassword("Administrador", "Neuro#Flex26")).not.toThrow();
    expect(() => checkPassword("Administrador", "123")).toThrow(/Administrador/);
  });
});

describe("splitCollections", () => {
  const names = ["students", "admins", "authusers", "gameattempts", "minicases", "migrations", "system.indexes"];

  it("por defecto conserva el banco de mini casos y las marcas de migración", () => {
    expect(splitCollections(names, false)).toEqual({
      clear: ["admins", "authusers", "gameattempts", "students"],
      keep: ["migrations", "minicases"],
    });
    expect([...KEEP_COLLECTIONS]).toEqual(["minicases", "migrations"]);
  });

  it("con includeMiniCases también vacía los casos, y nunca las colecciones internas", () => {
    const { clear, keep } = splitCollections(names, true);

    expect(clear).toContain("minicases");
    expect(keep).toEqual(["migrations"]);
    expect([...clear, ...keep]).not.toContain("system.indexes");
  });
});

describe("resetDatabase", () => {
  const data = () => ({
    students: [{ rut: "1" }, { rut: "2" }, { rut: "3" }],
    admins: [{ rut: "9" }],
    authusers: [{ rut: "1" }, { rut: "9" }],
    gameattempts: [{ a: 1 }],
    minicases: [{ caseKey: "caso-1" }, { caseKey: "caso-2" }],
    migrations: [{ _id: "ciudad-a-comuna" }],
  });
  const seed = [
    { collection: "admins", docs: [{ rut: "18299618-1" }] },
    { collection: "authusers", docs: [{ rut: "18299618-1", password: "hash" }] },
  ];

  it("sin apply solo cuenta: no respalda, no borra, no escribe", async () => {
    const { db, calls, state } = fakeDb(data());
    const backup = vi.fn();
    const result = await resetDatabase(db, { apply: false, includeMiniCases: false, seed, backup });

    expect(result.applied).toBe(false);
    expect(result.cleared).toEqual([
      { name: "admins", count: 1 },
      { name: "authusers", count: 2 },
      { name: "gameattempts", count: 1 },
      { name: "students", count: 3 },
    ]);
    expect(result.kept).toEqual([
      { name: "migrations", count: 1 },
      { name: "minicases", count: 2 },
    ]);
    expect(backup).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
    expect(state.students).toHaveLength(3);
  });

  it("con apply respalda ANTES de borrar, vacía lo de prueba, deja las cuentas y conserva el banco", async () => {
    const { db, calls, state } = fakeDb(data());
    const backup = vi.fn(() => {
      expect(calls).toEqual([]);
    });
    const result = await resetDatabase(db, { apply: true, includeMiniCases: false, seed, backup });

    expect(result.applied).toBe(true);
    expect(backup).toHaveBeenCalledOnce();
    expect(Object.keys((backup.mock.calls[0] as unknown as [Record<string, unknown>])[0]).sort()).toEqual([
      "admins",
      "authusers",
      "gameattempts",
      "students",
    ]);
    expect(state.students).toEqual([]);
    expect(state.gameattempts).toEqual([]);
    expect(state.admins).toEqual([{ rut: "18299618-1" }]);
    expect(state.authusers).toEqual([{ rut: "18299618-1", password: "hash" }]);
    expect(state.minicases).toHaveLength(2);
    expect(state.migrations).toHaveLength(1);
  });

  it("si el respaldo falla no se borra nada", async () => {
    const { db, calls, state } = fakeDb(data());
    const backup = () => {
      throw new Error("sin espacio");
    };

    await expect(resetDatabase(db, { apply: true, includeMiniCases: false, seed, backup })).rejects.toThrow("sin espacio");
    expect(calls).toEqual([]);
    expect(state.students).toHaveLength(3);
  });

  it("con includeMiniCases vacía también el banco", async () => {
    const { db, state } = fakeDb(data());

    await resetDatabase(db, { apply: true, includeMiniCases: true, seed, backup: () => {} });

    expect(state.minicases).toEqual([]);
    expect(state.migrations).toHaveLength(1);
  });
});
