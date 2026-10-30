import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as "student" | "admin",
  found: true as boolean,
  calls: [] as { filter: unknown; update: unknown; options: unknown }[],
}));

vi.mock("./auth", () => ({
  requireAuth: (
    _req: unknown,
    res: { status: (n: number) => { json: (b: unknown) => void } },
    roles?: string[],
  ) => {
    if (roles && !roles.includes(mocks.role)) {
      res.status(403).json({ success: false, message: "No autorizado." });
      return null;
    }

    return { rut: "99999999-9", role: mocks.role };
  },
}));

vi.mock("./db", () => ({ connectDB: async () => {} }));

vi.mock("./models/Student", () => ({
  Student: {
    findOneAndUpdate: async (filter: unknown, update: unknown, options: unknown) => {
      mocks.calls.push({ filter, update, options });

      return mocks.found ? { rut: "12345678-5" } : null;
    },
  },
}));

import handler from "./handlers/admin/studentContact";

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
  mocks.found = true;
  mocks.calls = [];
});

describe("PATCH admin/students/:rut/contact", () => {
  it("«Contactado» guarda quien y cuando", async () => {
    const { status, json } = await run({ contacted: true });

    expect(status).toBe(200);
    expect(json.message).toBe("Marcado como contactado.");
    expect(mocks.calls[0]?.filter).toEqual({ rut: "12345678-5", isDeleted: { $ne: true } });

    const { update } = mocks.calls[0] ?? { update: { $set: {} } };
    const { $set: set } = update as { $set: { contacted?: boolean; contactedAt?: Date; contactedBy?: string } };

    expect(set.contacted).toBe(true);
    expect(set.contactedBy).toBe("99999999-9");
    expect(set.contactedAt).toBeInstanceOf(Date);
  });

  it("«Falta contactar» borra la fecha y el administrador", async () => {
    await run({ contacted: false });

    expect(mocks.calls[0]?.update).toEqual({
      $set: { contacted: false },
      $unset: { contactedAt: "", contactedBy: "" },
    });
  });

  it.each([[{}], [{ contacted: "true" }], [{ contacted: 1 }], [undefined]])("rechaza un valor que no es true/false: %j", async (body) => {
    const { status } = await run(body);

    expect(status).toBe(400);
    expect(mocks.calls).toHaveLength(0);
  });

  it("un estudiante no puede marcarse, y solo existe PATCH", async () => {
    mocks.role = "student";

    expect((await run({ contacted: true })).status).toBe(403);

    mocks.role = "admin";

    expect((await run({ contacted: true }, "GET")).status).toBe(405);
    expect(mocks.calls).toHaveLength(0);
  });

  it("un estudiante que no existe (o fue borrado) da 404", async () => {
    mocks.found = false;

    const { status, json } = await run({ contacted: true });

    expect(status).toBe(404);
    expect(json.message).toBe("Estudiante no encontrado.");
  });
});
