import { describe, expect, it, vi } from "vitest";

import { removeTeachers, type DbLike } from "./removeTeachers";

type Doc = { _id: string; rut: string; role?: string };

function fakeDb(state: { teachers?: Doc[]; accounts: Doc[] }) {
  const calls: string[] = [];

  const db: DbLike = {
    listCollections: () => ({ toArray: async () => (state.teachers ? [{ name: "teachers" }] : []) }),
    collection: (name) => ({
      find: (filter) => ({
        toArray: async () =>
          name === "teachers"
            ? (state.teachers ?? [])
            : state.accounts.filter((a) => !filter || a.role === filter.role),
      }),
      deleteMany: async (filter) => {
        const ids = (filter._id as { $in: string[] }).$in;
        const before = state.accounts.length;

        state.accounts = state.accounts.filter((a) => !(ids.includes(a._id) && a.role === filter.role));
        calls.push(`deleteMany ${name}`);

        return { deletedCount: before - state.accounts.length };
      },
      drop: async () => {
        calls.push(`drop ${name}`);
        state.teachers = undefined;
      },
    }),
  };

  return { db, calls, state };
}

const DATA = () => ({
  teachers: [{ _id: "t1", rut: "11111111-1" }],
  accounts: [
    { _id: "a1", rut: "11111111-1", role: "teacher" },
    { _id: "a2", rut: "22222222-2", role: "admin" },
    { _id: "a3", rut: "33333333-3", role: "student" },
  ],
});

describe("removeTeachers", () => {
  it("sin apply solo informa: no respalda ni borra", async () => {
    const { db, calls } = fakeDb(DATA());
    const backup = vi.fn();

    const result = await removeTeachers(db, { apply: false, backup });

    expect(result.applied).toBe(false);
    expect(result.teachers).toHaveLength(1);
    expect(result.accounts).toHaveLength(1);
    expect(backup).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("con apply respalda primero y luego borra solo lo del docente", async () => {
    const { db, calls, state } = fakeDb(DATA());
    const backup = vi.fn(() => {
      expect(calls).toEqual([]);
    });

    const result = await removeTeachers(db, { apply: true, backup });

    expect(backup).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ applied: true, accountsDeleted: 1 });
    expect(calls).toEqual(["deleteMany authusers", "drop teachers"]);
    expect(state.accounts.map((a) => a.role)).toEqual(["admin", "student"]);
  });

  it("si el respaldo falla, no borra nada", async () => {
    const { db, calls, state } = fakeDb(DATA());

    await expect(
      removeTeachers(db, {
        apply: true,
        backup: () => {
          throw new Error("disco lleno");
        },
      }),
    ).rejects.toThrow("disco lleno");

    expect(calls).toEqual([]);
    expect(state.accounts).toHaveLength(3);
  });

  it("si ya no queda nada, no hace nada aunque se pida apply", async () => {
    const { db, calls } = fakeDb({ accounts: [{ _id: "a2", rut: "2-7", role: "admin" }] });
    const backup = vi.fn();

    const result = await removeTeachers(db, { apply: true, backup });

    expect(result.applied).toBe(false);
    expect(backup).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("sin cuentas pero con la coleccion vieja, la elimina", async () => {
    const { db, calls } = fakeDb({ teachers: [], accounts: [] });

    const result = await removeTeachers(db, { apply: true, backup: () => undefined });

    expect(result.applied).toBe(true);
    expect(calls).toContain("drop teachers");
  });
});
