import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as "student" | "admin",
  authorized: true as boolean,
  found: true as boolean,
  updates: [] as { filter: unknown; update: unknown }[],
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

vi.mock("./models/Admin", () => ({
  Admin: {
    findOneAndUpdate: async (filter: unknown, update: unknown) => {
      mocks.updates.push({ filter, update });

      return mocks.found ? { rut: "12345678-5", ...((update as { $set: object }).$set) } : null;
    },
  },
}));

import handler from "./handlers/admin/adminDetails";

function run(method: string, body?: unknown) {
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

  const req = { method, body, query: { rut: "12345678-5" }, headers: {} } as unknown as VercelRequest;

  return Promise.resolve(handler(req, res)).then(() => ({ status, json }));
}

beforeEach(() => {
  mocks.role = "admin";
  mocks.authorized = true;
  mocks.found = true;
  mocks.updates = [];
});

describe("PATCH admin/admins/:rut", () => {
  it("corrige nombres y apellidos con la inicial de cada palabra en mayuscula", async () => {
    const { status, json } = await run("PATCH", {
      firstName: " camiLo  andres ",
      paternalLastName: "BRIONES",
      maternalLastName: "vergara",
    });

    expect(status).toBe(200);
    expect(mocks.updates).toEqual([
      {
        filter: { rut: "12345678-5" },
        update: { $set: { firstName: "Camilo Andres", paternalLastName: "Briones", maternalLastName: "Vergara" } },
      },
    ]);
    expect(json.data.firstName).toBe("Camilo Andres");
  });

  it("puede cambiar solo un campo; el RUT, el estado y la clave no se tocan", async () => {
    await run("PATCH", { paternalLastName: "soto", rut: "1-9", enabled: false, password: "x" });

    expect(mocks.updates[0]?.update).toEqual({ $set: { paternalLastName: "Soto" } });
  });

  it("solo un administrador con sesion, y solo PATCH", async () => {
    mocks.role = "student";
    expect((await run("PATCH", { firstName: "Ana" })).status).toBe(403);

    mocks.authorized = false;
    expect((await run("PATCH", { firstName: "Ana" })).status).toBe(401);

    mocks.authorized = true;
    mocks.role = "admin";
    expect((await run("GET")).status).toBe(405);
    expect(mocks.updates).toHaveLength(0);
  });

  it("sin datos, vacios o con simbolos: 400 y no guarda", async () => {
    for (const body of [undefined, {}, { firstName: "" }, { maternalLastName: "  " }, { firstName: "Ana3" }]) {
      expect((await run("PATCH", body)).status, JSON.stringify(body)).toBe(400);
    }

    expect(mocks.updates).toHaveLength(0);
  });

  it("administrador inexistente: 404", async () => {
    mocks.found = false;

    expect((await run("PATCH", { firstName: "Ana" })).status).toBe(404);
  });
});
