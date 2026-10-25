import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { rut: "12345678-5", role: "student" } as { rut: string; role: string } | null,
  found: true as boolean,
  writes: [] as { model: string; filter: unknown; update: unknown }[],
}));

vi.mock("./cookies", () => ({ readSessionCookie: () => (mocks.session ? "token" : undefined) }));
vi.mock("./jwt", () => ({ verifyToken: () => mocks.session }));
vi.mock("./sessions", async () => (await import("./sessionsMock")).sessionsMock);
vi.mock("./db", () => ({ connectDB: async () => undefined }));

function model(name: string) {
  return {
    findOneAndUpdate: async (filter: unknown, update: { email: string; avatarId: string }) => {
      mocks.writes.push({ model: name, filter, update });

      return mocks.found ? { email: update.email, avatarId: update.avatarId } : null;
    },
  };
}

vi.mock("./models/Student", () => ({ Student: model("student") }));
vi.mock("./models/Admin", () => ({ Admin: model("admin") }));

import handler from "./handlers/profile/contact";

function run(body: unknown, rut = "12345678-5", method = "PATCH") {
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

  const req = { method, body, query: { rut }, headers: { cookie: "x" } } as unknown as VercelRequest;

  return handler(req, res).then(() => ({ status, json }));
}

beforeEach(() => {
  mocks.session = { rut: "12345678-5", role: "student" };
  mocks.found = true;
  mocks.writes = [];
});

describe("PATCH profile/:rut/contact (perfil propio)", () => {
  it("guarda el correo en minusculas aunque se haya escrito con mayusculas", async () => {
    const { status, json } = await run({ email: "  Ana.Perez@UVM.CL ", avatarId: "cat" });

    expect(status).toBe(200);
    expect(mocks.writes[0]?.update).toEqual({ email: "ana.perez@uvm.cl", avatarId: "cat" });
    expect(json.data).toEqual({ email: "ana.perez@uvm.cl", avatarId: "cat" });
  });

  it("rechaza un correo invalido diciendo que falta, sin escribir en la base", async () => {
    for (const [email, message] of [
      ["ana", "Falta el @ en el correo."],
      ["ana@uvm", "Falta el punto del dominio después del @ (por ejemplo, .cl o .com)."],
      ["josé@uvm.cl", "El correo solo puede llevar letras (sin tilde, la ñ sí), números y los símbolos . _ -"],
      ["", "Ingresa un correo."],
    ]) {
      const { status, json } = await run({ email, avatarId: "cat" });

      expect(status, email).toBe(400);
      expect(json.message).toBe(message);
    }

    for (const body of [undefined, {}, { email: 5 }, { email: null }]) {
      expect((await run(body)).status).toBe(400);
    }

    expect(mocks.writes).toHaveLength(0);
  });

  it("aplica la misma regla a estudiantes y administradores", async () => {
    mocks.session = { rut: "12345678-5", role: "student" };
    await run({ email: "Est@UVM.cl", avatarId: "cat" });

    mocks.session = { rut: "12345678-5", role: "admin" };
    await run({ email: "Adm@UVM.cl", avatarId: "cat" });

    expect(mocks.writes.map((w) => [w.model, (w.update as { email: string }).email])).toEqual([
      ["student", "est@uvm.cl"],
      ["admin", "adm@uvm.cl"],
    ]);
  });

  it("un rol que ya no existe (docente) no edita nada: 403", async () => {
    mocks.session = { rut: "12345678-5", role: "teacher" };

    expect((await run({ email: "doc@uvm.cl", avatarId: "cat" })).status).toBe(403);
    expect(mocks.writes).toHaveLength(0);
  });

  it("solo se edita el propio perfil, y hace falta sesion", async () => {
    expect((await run({ email: "a@b.cl" }, "99999999-9")).status).toBe(403);

    mocks.session = null;
    expect((await run({ email: "a@b.cl" })).status).toBe(401);

    expect(mocks.writes).toHaveLength(0);
  });
});
