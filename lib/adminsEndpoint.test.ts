import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as "student" | "admin",
  authorized: true as boolean,
  self: "99999999-9",
  adminExists: false as boolean,
  accountExists: false as boolean,
  admins: [] as Record<string, unknown>[],
  createdAdmins: [] as Record<string, unknown>[],
  createdAccounts: [] as Record<string, unknown>[],
  adminUpdates: [] as { filter: unknown; update: unknown }[],
  accountUpdates: [] as { filter: unknown; update: unknown }[],
  found: true as boolean,
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
}));

vi.mock("./models/Admin", () => ({
  Admin: {
    find: () => ({ sort: () => ({ lean: async () => mocks.admins }) }),
    findOne: async () => (mocks.adminExists ? { rut: "12345678-5" } : null),
    create: async (doc: Record<string, unknown>) => {
      mocks.createdAdmins.push(doc);

      return { ...doc, enabled: true };
    },
    findOneAndUpdate: async (filter: unknown, update: unknown) => {
      mocks.adminUpdates.push({ filter, update });

      return mocks.found ? { rut: "12345678-5", ...(update as object) } : null;
    },
  },
}));

vi.mock("./models/AuthUser", () => ({
  AuthUser: {
    findOne: async () => (mocks.accountExists ? { rut: "12345678-5" } : null),
    create: async (doc: Record<string, unknown>) => {
      mocks.createdAccounts.push(doc);

      return doc;
    },
    updateOne: async (filter: unknown, update: unknown) => {
      mocks.accountUpdates.push({ filter, update });
    },
  },
}));

import adminsHandler from "./handlers/admin/admins";
import statusHandler from "./handlers/admin/adminStatus";

type Handler = typeof adminsHandler;

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

const BASE = {
  rut: "12.345.678-5",
  firstName: " Ana ",
  paternalLastName: "Pérez",
  maternalLastName: "Soto",
  password: "Segura#2026a",
};

beforeEach(() => {
  mocks.role = "admin";
  mocks.authorized = true;
  mocks.adminExists = false;
  mocks.accountExists = false;
  mocks.admins = [];
  mocks.createdAdmins = [];
  mocks.createdAccounts = [];
  mocks.adminUpdates = [];
  mocks.accountUpdates = [];
  mocks.found = true;
});

describe("admin/admins: acceso", () => {
  it("solo un administrador con sesion", async () => {
    mocks.role = "student";
    expect((await run(adminsHandler, "GET")).status).toBe(403);
    expect((await run(adminsHandler, "POST", BASE)).status).toBe(403);
    expect((await run(statusHandler, "PATCH", { enabled: false }, { rut: "1-9" })).status).toBe(403);

    mocks.authorized = false;
    expect((await run(adminsHandler, "GET")).status).toBe(401);

    expect(mocks.createdAdmins).toHaveLength(0);
    expect(mocks.createdAccounts).toHaveLength(0);
    expect(mocks.adminUpdates).toHaveLength(0);
  });

  it("otros metodos: 405", async () => {
    expect((await run(adminsHandler, "DELETE")).status).toBe(405);
    expect((await run(statusHandler, "POST", { enabled: true })).status).toBe(405);
  });
});

describe("GET admin/admins", () => {
  it("lista los administradores", async () => {
    mocks.admins = [{ rut: "12345678-5", firstName: "Ana" }];

    const { status, json } = await run(adminsHandler, "GET");

    expect(status).toBe(200);
    expect(json.data).toEqual(mocks.admins);
  });
});

describe("POST admin/admins", () => {
  it("crea la ficha y la cuenta de acceso, con la clave cifrada", async () => {
    const { status, json } = await run(adminsHandler, "POST", BASE);

    expect(status).toBe(201);
    expect(mocks.createdAdmins).toEqual([
      { rut: "12345678-5", firstName: "Ana", paternalLastName: "Pérez", maternalLastName: "Soto" },
    ]);
    expect(mocks.createdAccounts).toEqual([
      { rut: "12345678-5", password: "hash(Segura#2026a)", role: "admin" },
    ]);
    expect(JSON.stringify(json)).not.toContain("Segura#2026a");
  });

  it("guarda los nombres con la inicial de cada palabra en mayuscula", async () => {
    await run(adminsHandler, "POST", {
      ...BASE,
      firstName: " camiLo  andres ",
      paternalLastName: "BRIONES",
      maternalLastName: "vergara",
    });

    expect(mocks.createdAdmins).toEqual([
      { rut: "12345678-5", firstName: "Camilo Andres", paternalLastName: "Briones", maternalLastName: "Vergara" },
    ]);
  });

  it("faltan datos, RUT invalido o clave debil: 400 y no crea nada", async () => {
    const bad = [
      { ...BASE, firstName: "  " },
      { ...BASE, firstName: "Ana3" },
      { ...BASE, rut: "12.345.678-9" },
      { ...BASE, password: undefined },
      { ...BASE, password: "Ab#1" },
      { ...BASE, password: "sinmayuscula#1" },
      { ...BASE, password: "SinEspecial12" },
      { ...BASE, password: "Repetida#1122" },
      undefined,
    ];

    for (const body of bad) {
      expect((await run(adminsHandler, "POST", body)).status).toBe(400);
    }

    expect(mocks.createdAdmins).toHaveLength(0);
    expect(mocks.createdAccounts).toHaveLength(0);
  });

  it("un RUT que ya tiene ficha o cuenta, de cualquier rol: 409", async () => {
    mocks.adminExists = true;
    expect((await run(adminsHandler, "POST", BASE)).status).toBe(409);

    mocks.adminExists = false;
    mocks.accountExists = true;
    expect((await run(adminsHandler, "POST", BASE)).status).toBe(409);

    expect(mocks.createdAdmins).toHaveLength(0);
    expect(mocks.createdAccounts).toHaveLength(0);
  });
});

describe("PATCH admin/admins/:rut/status", () => {
  const query = { rut: "12345678-5" };

  it("habilita o inhabilita la ficha y la cuenta juntas", async () => {
    const { status } = await run(statusHandler, "PATCH", { enabled: false }, query);

    expect(status).toBe(200);
    expect(mocks.adminUpdates).toEqual([{ filter: { rut: "12345678-5" }, update: { enabled: false } }]);
    expect(mocks.accountUpdates).toEqual([
      { filter: { rut: "12345678-5", role: "admin" }, update: { enabled: false } },
    ]);
  });

  it("nadie puede inhabilitarse a si mismo: siempre queda un administrador activo", async () => {
    mocks.self = "12345678-5";

    expect((await run(statusHandler, "PATCH", { enabled: false }, query)).status).toBe(400);
    expect(mocks.adminUpdates).toHaveLength(0);

    // Habilitarse a si mismo no cambia nada y no se bloquea.
    expect((await run(statusHandler, "PATCH", { enabled: true }, query)).status).toBe(200);

    mocks.self = "99999999-9";
  });

  it("valor invalido: 400; RUT inexistente: 404 y no toca la cuenta", async () => {
    expect((await run(statusHandler, "PATCH", { enabled: "si" }, query)).status).toBe(400);
    expect((await run(statusHandler, "PATCH", undefined, query)).status).toBe(400);

    mocks.found = false;
    expect((await run(statusHandler, "PATCH", { enabled: true }, query)).status).toBe(404);
    expect(mocks.accountUpdates).toHaveLength(0);
  });
});
