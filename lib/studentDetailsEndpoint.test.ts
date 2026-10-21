import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as "student" | "teacher" | "admin",
  authorized: true as boolean,
  found: true as boolean,
  calls: [] as { filter: unknown; update: unknown; options: unknown }[],
  connects: 0,
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

vi.mock("./db", () => ({
  connectDB: async () => {
    mocks.connects += 1;
  },
}));

vi.mock("./models/Student", () => ({
  Student: {
    findOneAndUpdate: async (filter: unknown, update: unknown, options: unknown) => {
      mocks.calls.push({ filter, update, options });

      return mocks.found ? { rut: "12345678-5", ...(update as { $set?: object }).$set } : null;
    },
  },
}));

import handler from "./handlers/admin/studentDetails";

function run(body: unknown, method = "PATCH") {
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

  const req = { method, body, query: { rut: "12345678-5" }, headers: {} } as unknown as VercelRequest;

  return handler(req, res).then(() => ({ status, json }));
}

beforeEach(() => {
  mocks.role = "admin";
  mocks.authorized = true;
  mocks.found = true;
  mocks.calls = [];
  mocks.connects = 0;
});

describe("PATCH admin/students/:rut/details", () => {
  it("guarda los campos nuevos con $set y quita los vaciados con $unset", async () => {
    const { status, json } = await run({ gender: "female", university: "uvm", ciudad: "" });

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(mocks.calls).toHaveLength(1);
    expect(mocks.calls[0]?.filter).toEqual({ rut: "12345678-5", isDeleted: { $ne: true } });
    expect(mocks.calls[0]?.update).toEqual({
      $set: { gender: "female", university: "uvm" },
      $unset: { ciudad: 1 },
    });
    expect(mocks.calls[0]?.options).toEqual({ new: true, runValidators: true });
  });

  it("el admin puede cambiar y vaciar el correo, y uno invalido se rechaza", async () => {
    await run({ email: "nuevo@uvm.cl" });
    await run({ email: "" });

    expect(mocks.calls[0]?.update).toEqual({ $set: { email: "nuevo@uvm.cl" } });
    expect(mocks.calls[1]?.update).toEqual({ $unset: { email: 1 } });

    const { status, json } = await run({ email: "no-es-correo" });

    expect(status).toBe(400);
    expect(json.message).toBe("El correo ingresado no es válido.");
    expect(mocks.calls).toHaveLength(2);
  });

  it("no manda un $set o $unset vacio (Mongo lo rechaza)", async () => {
    await run({ ciudad: "" });
    await run({ gender: "male" });

    expect(mocks.calls[0]?.update).toEqual({ $unset: { ciudad: 1 } });
    expect(mocks.calls[1]?.update).toEqual({ $set: { gender: "male" } });
  });

  it("un dato invalido responde 400 y no toca la base", async () => {
    const { status, json } = await run({ gender: "femenino" });

    expect(status).toBe(400);
    expect(json.message).toBe("El género indicado no es válido.");
    expect(mocks.calls).toHaveLength(0);
    expect(mocks.connects).toBe(0);
  });

  it("estudiante inexistente o borrado: 404", async () => {
    mocks.found = false;

    expect((await run({ ciudad: "Temuco" })).status).toBe(404);
  });

  it("solo el admin: sin sesion 401, otros roles 403, y no toca la base", async () => {
    mocks.authorized = false;
    expect((await run({ ciudad: "x" })).status).toBe(401);

    mocks.authorized = true;
    mocks.role = "student";
    expect((await run({ ciudad: "x" })).status).toBe(403);

    mocks.role = "teacher";
    expect((await run({ ciudad: "x" })).status).toBe(403);

    expect(mocks.calls).toHaveLength(0);
  });

  it("otros metodos: 405", async () => {
    expect((await run({ ciudad: "x" }, "POST")).status).toBe(405);
    expect((await run({ ciudad: "x" }, "GET")).status).toBe(405);
  });
});
