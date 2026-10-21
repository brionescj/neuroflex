import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as "student" | "teacher" | "admin",
  authorized: true as boolean,
  exists: false as boolean,
  created: [] as Record<string, unknown>[],
  lookups: 0,
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

    return { rut: "99999999-9", role: mocks.role };
  },
}));

vi.mock("./db", () => ({ connectDB: async () => undefined }));

vi.mock("./models/Student", () => ({
  Student: {
    find: () => ({ sort: async () => [] }),
    findOne: async () => {
      mocks.lookups += 1;

      return mocks.exists ? { rut: "12345678-5" } : null;
    },
    create: async (doc: Record<string, unknown>) => {
      mocks.created.push(doc);

      return doc;
    },
  },
}));

import handler from "./handlers/admin/students";

const BASE = {
  rut: "12.345.678-5",
  firstName: "Ana",
  paternalLastName: "Pérez",
  maternalLastName: "Soto",
  paralelo: 2,
};

function run(body: unknown, method = "POST") {
  let status = 0;
  let json: Record<string, unknown> = {};

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

  const req = { method, body, query: {}, headers: {} } as unknown as VercelRequest;

  return handler(req, res).then(() => ({ status, json }));
}

beforeEach(() => {
  mocks.role = "admin";
  mocks.authorized = true;
  mocks.exists = false;
  mocks.created = [];
  mocks.lookups = 0;
});

describe("POST admin/students (alta manual)", () => {
  it("guarda genero, universidad, fecha de nacimiento y correo junto a los datos basicos", async () => {
    const { status } = await run({
      ...BASE,
      ciudad: " Temuco ",
      region: "La Araucanía",
      celular: "12345678",
      email: "ana@uvm.cl",
      gender: "female",
      university: "uvm",
      birthDate: "2001-03-15",
    });

    expect(status).toBe(201);
    expect(mocks.created).toEqual([
      {
        rut: "12345678-5",
        firstName: "Ana",
        paternalLastName: "Pérez",
        maternalLastName: "Soto",
        paralelo: 2,
        ciudad: "Temuco",
        region: "La Araucanía",
        celular: "12345678",
        email: "ana@uvm.cl",
        gender: "female",
        university: "uvm",
        birthDate: "2001-03-15",
      },
    ]);
  });

  it("los datos opcionales no son obligatorios, y los vacios no se guardan", async () => {
    const { status } = await run({ ...BASE, ciudad: "", email: "  ", gender: "" });

    expect(status).toBe(201);
    expect(mocks.created).toEqual([
      {
        rut: "12345678-5",
        firstName: "Ana",
        paternalLastName: "Pérez",
        maternalLastName: "Soto",
        paralelo: 2,
      },
    ]);
  });

  it("un dato opcional invalido responde 400 y no crea nada", async () => {
    for (const [extra, message] of [
      [{ gender: "femenino" }, "El género indicado no es válido."],
      [{ university: "Otra" }, "La universidad indicada no es válida."],
      [{ birthDate: "2999-01-01" }, "La fecha de nacimiento no es válida."],
      [{ birthDate: "15-03-2001" }, "La fecha de nacimiento no es válida."],
      [{ email: "ana@" }, "El correo ingresado no es válido."],
    ] as const) {
      const { status, json } = await run({ ...BASE, ...extra });

      expect(status, message).toBe(400);
      expect(json.message).toBe(message);
    }

    expect(mocks.created).toHaveLength(0);
    expect(mocks.lookups).toBe(0);
  });

  it("sin los datos obligatorios o con RUT invalido, 400", async () => {
    expect((await run({ ...BASE, firstName: "" })).status).toBe(400);
    expect((await run({ ...BASE, rut: "12.345.678-9" })).status).toBe(400);
    expect((await run(undefined)).status).toBe(400);
    expect(mocks.created).toHaveLength(0);
  });

  it("RUT ya existente: 409 y no crea", async () => {
    mocks.exists = true;

    expect((await run(BASE)).status).toBe(409);
    expect(mocks.created).toHaveLength(0);
  });

  it("solo el admin puede dar de alta", async () => {
    mocks.role = "teacher";
    expect((await run(BASE)).status).toBe(403);

    mocks.authorized = false;
    expect((await run(BASE)).status).toBe(401);
    expect(mocks.created).toHaveLength(0);
  });
});
