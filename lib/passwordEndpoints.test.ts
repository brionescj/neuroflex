import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Doc = Record<string, unknown>;

const mocks = vi.hoisted(() => ({
  role: "admin" as "student" | "admin",
  authorized: true as boolean,
  self: "99999999-9",
  /** Cuentas de acceso por RUT (la clave ya cifrada como hash(...)). */
  accounts: {} as Record<string, { rut: string; password: string; role: string; enabled: boolean }>,
  student: null as null | { rut: string; enabled: boolean; registered: boolean; save: () => Promise<void> },
  saves: 0,
  created: [] as Doc[],
  updates: [] as { filter: Doc; update: Doc }[],
}));

vi.mock("./auth", () => ({
  requireAuth: (
    _req: unknown,
    res: { status: (n: number) => { json: (b: unknown) => void } },
    roles?: string[],
  ) => {
    if (!mocks.authorized) {
      res.status(401).json({ success: false, message: "No autenticado." });
      return null;
    }

    if (roles && !roles.includes(mocks.role)) {
      res.status(403).json({ success: false, message: "No autorizado." });
      return null;
    }

    return { rut: mocks.self, role: mocks.role };
  },
}));

vi.mock("./db", () => ({ connectDB: async () => undefined }));

vi.mock("./password", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./password")>()),
  hashPassword: async (plain: string) => `hash(${plain})`,
  verifyPassword: async (plain: string, hash: string) => hash === `hash(${plain})`,
}));

vi.mock("./models/AuthUser", () => ({
  AuthUser: {
    findOne: async (filter: { rut: string }) => mocks.accounts[filter.rut] ?? null,
    create: async (doc: Doc) => {
      mocks.created.push(doc);
      mocks.accounts[doc.rut as string] = doc as never;

      return doc;
    },
    updateOne: async (filter: Doc, update: Doc) => {
      mocks.updates.push({ filter, update });
    },
  },
}));

vi.mock("./models/Student", () => ({
  Student: { findOne: async () => mocks.student },
}));

import studentPasswordHandler from "./handlers/admin/studentPassword";
import ownPasswordHandler from "./handlers/auth/password";
import { validatePasswordStrength } from "./password";

type Handler = typeof studentPasswordHandler;

function run(handler: Handler, method: string, body?: unknown, query: Record<string, unknown> = {}) {
  let status = 0;
  let json: Record<string, any> = {};

  const res = {
    status(code: number) {
      status = code;

      return this;
    },
    json(payload: Record<string, unknown>) {
      json = payload;

      return this;
    },
  } as unknown as VercelResponse;

  const req = { method, body, query, headers: {} } as unknown as VercelRequest;

  return Promise.resolve(handler(req, res)).then(() => ({ status, json }));
}

const ADMIN_PASSWORD = "Admin#Clave26";

function makeStudent(overrides: Partial<NonNullable<typeof mocks.student>> = {}) {
  return {
    rut: "12345678-5",
    enabled: true,
    registered: true,
    save: async () => {
      mocks.saves += 1;
    },
    ...overrides,
  };
}

beforeEach(() => {
  mocks.role = "admin";
  mocks.authorized = true;
  mocks.accounts = {
    [mocks.self]: { rut: mocks.self, password: `hash(${ADMIN_PASSWORD})`, role: "admin", enabled: true },
  };
  mocks.student = makeStudent();
  mocks.saves = 0;
  mocks.created = [];
  mocks.updates = [];
});

describe("POST admin/students/:rut/password", () => {
  const call = (body: unknown = { adminPassword: ADMIN_PASSWORD }) =>
    run(studentPasswordHandler, "POST", body, { rut: "12345678-5" });

  it("solo un administrador con sesion, y solo POST", async () => {
    mocks.role = "student";
    expect((await call()).status).toBe(403);

    mocks.authorized = false;
    expect((await call()).status).toBe(401);

    mocks.authorized = true;
    mocks.role = "admin";
    expect((await run(studentPasswordHandler, "GET", undefined, { rut: "12345678-5" })).status).toBe(405);

    expect(mocks.created).toHaveLength(0);
    expect(mocks.updates).toHaveLength(0);
  });

  it("sin la contraseña del administrador, o con una incorrecta, no cambia nada", async () => {
    expect((await call({})).status).toBe(400);
    expect((await call({ adminPassword: "" })).status).toBe(400);
    expect((await call({ adminPassword: 123 })).status).toBe(400);

    // 403 y no 401: un 401 se lee como sesion vencida.
    const wrong = await call({ adminPassword: "Otra#Clave26" });

    expect(wrong.status).toBe(403);
    expect(wrong.json.message).toBe("Su contraseña no es correcta.");
    expect(mocks.created).toHaveLength(0);
    expect(mocks.updates).toHaveLength(0);
  });

  it("estudiante ya registrado: guarda la contraseña nueva cifrada y la entrega una sola vez", async () => {
    mocks.accounts["12345678-5"] = { rut: "12345678-5", password: "hash(vieja)", role: "student", enabled: true };

    const { status, json } = await call();

    expect(status).toBe(200);
    expect(json.data.createdAccount).toBe(false);
    expect(validatePasswordStrength(json.data.password)).toBeNull();
    expect(mocks.updates).toEqual([
      { filter: { rut: "12345678-5" }, update: { password: `hash(${json.data.password})` } },
    ]);
    expect(mocks.created).toHaveLength(0);
    expect(mocks.saves).toBe(0);
  });

  it("estudiante que aun no se registro: se crea su cuenta y queda registrado", async () => {
    mocks.student = makeStudent({ registered: false });

    const { status, json } = await call();

    expect(status).toBe(200);
    expect(json.data.createdAccount).toBe(true);
    expect(mocks.created).toEqual([
      { rut: "12345678-5", password: `hash(${json.data.password})`, role: "student", enabled: true },
    ]);
    expect(mocks.student?.registered).toBe(true);
    expect(mocks.saves).toBe(1);
    // En la base solo queda la version cifrada, nunca la contraseña tal cual.
    expect(mocks.created[0]?.password).not.toBe(json.data.password);
  });

  it("un estudiante inhabilitado sin cuenta queda con la cuenta inhabilitada", async () => {
    mocks.student = makeStudent({ registered: false, enabled: false });

    await call();

    expect(mocks.created[0]?.enabled).toBe(false);
  });

  it("estudiante inexistente: 404; un RUT con cuenta de otro rol: 409", async () => {
    mocks.student = null;
    expect((await call()).status).toBe(404);

    mocks.student = makeStudent();
    mocks.accounts["12345678-5"] = { rut: "12345678-5", password: "hash(x)", role: "admin", enabled: true };
    expect((await call()).status).toBe(409);

    expect(mocks.created).toHaveLength(0);
    expect(mocks.updates).toHaveLength(0);
  });

  it("cada vez entrega una contraseña distinta", async () => {
    const first = (await call()).json.data.password;
    const second = (await call()).json.data.password;

    expect(first).not.toBe(second);
  });
});

describe("POST auth/password", () => {
  const OWN = "Actual#Clave26";
  const call = (body: unknown) => run(ownPasswordHandler, "POST", body);

  beforeEach(() => {
    mocks.accounts[mocks.self] = { rut: mocks.self, password: `hash(${OWN})`, role: "admin", enabled: true };
  });

  it("sin sesion: 401; otros metodos: 405", async () => {
    mocks.authorized = false;
    expect((await call({ currentPassword: OWN, newPassword: "Nueva#Clave37" })).status).toBe(401);

    mocks.authorized = true;
    expect((await run(ownPasswordHandler, "GET")).status).toBe(405);
    expect(mocks.updates).toHaveLength(0);
  });

  it("estudiantes y administradores pueden cambiar la propia", async () => {
    for (const role of ["student", "admin"] as const) {
      mocks.role = role;
      mocks.updates = [];

      const { status } = await call({ currentPassword: OWN, newPassword: "Nueva#Clave37" });

      expect(status, role).toBe(200);
      expect(mocks.updates).toEqual([{ filter: { rut: mocks.self }, update: { password: "hash(Nueva#Clave37)" } }]);
    }
  });

  it("con la actual equivocada: 403 y no cambia nada", async () => {
    const { status, json } = await call({ currentPassword: "Equivocada#26", newPassword: "Nueva#Clave37" });

    expect(status).toBe(403);
    expect(json.message).toBe("La contraseña actual no es correcta.");
    expect(mocks.updates).toHaveLength(0);
  });

  it("faltan datos: 400", async () => {
    for (const body of [undefined, {}, { currentPassword: OWN }, { newPassword: "Nueva#Clave37" }, { currentPassword: "", newPassword: "x" }]) {
      expect((await call(body)).status, JSON.stringify(body)).toBe(400);
    }

    expect(mocks.updates).toHaveLength(0);
  });

  it("la nueva debe cumplir las reglas y ser distinta de la actual", async () => {
    for (const newPassword of ["Ab#1", "sinmayuscula#1", "SinEspecial12", "Repetida#1122"]) {
      expect((await call({ currentPassword: OWN, newPassword })).status, newPassword).toBe(400);
    }

    const same = await call({ currentPassword: OWN, newPassword: OWN });

    expect(same.status).toBe(400);
    expect(same.json.message).toBe("La nueva contraseña debe ser distinta de la actual.");
    expect(mocks.updates).toHaveLength(0);
  });

  it("nunca devuelve ninguna contraseña", async () => {
    const { json } = await call({ currentPassword: OWN, newPassword: "Nueva#Clave37" });

    expect(JSON.stringify(json)).not.toContain("Nueva#Clave37");
  });
});
