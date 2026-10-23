import type { VercelRequest, VercelResponse } from "@vercel/node";
import jsonwebtoken from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = "secreto-de-prueba";

  return {
    account: null as Record<string, unknown> | null,
    profileCalls: 0,
  };
});

vi.mock("./db", () => ({ connectDB: async () => undefined }));
vi.mock("./password", () => ({ verifyPassword: async () => true }));
vi.mock("./models/AuthUser", () => ({
  AuthUser: { findOne: async () => mocks.account },
}));
vi.mock("./findProfile", () => ({
  findProfile: async () => {
    mocks.profileCalls += 1;

    return { firstName: "Ana", paternalLastName: "Pérez", avatarId: "panda", enabled: true };
  },
}));

import loginHandler from "./handlers/auth/login";
import { signToken, verifyToken } from "./jwt";

function login() {
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
    setHeader() {
      return this;
    },
  } as unknown as VercelResponse;

  const req = { method: "POST", body: { rut: "12345678-5", password: "x" }, headers: {} } as unknown as VercelRequest;

  return Promise.resolve(loginHandler(req, res)).then(() => ({ status, json }));
}

beforeEach(() => {
  mocks.account = null;
  mocks.profileCalls = 0;
});

describe("los roles que existen: estudiante y administrador", () => {
  it("el token de un estudiante o un administrador vale", () => {
    for (const role of ["student", "admin"] as const) {
      expect(verifyToken(signToken({ id: "1", rut: "12345678-5", role }))?.role).toBe(role);
    }
  });

  it("el token de un rol que ya no existe (docente) no vale", () => {
    const old = jsonwebtoken.sign({ id: "1", rut: "12345678-5", role: "teacher" }, "secreto-de-prueba");

    expect(verifyToken(old)).toBeNull();
  });

  it("una cuenta de docente que aun queda en la base no puede iniciar sesion", async () => {
    mocks.account = { id: "1", rut: "12345678-5", password: "h", role: "teacher", enabled: true };

    const { status, json } = await login();

    expect(status).toBe(401);
    expect(json.message).toBe("RUT o contraseña incorrectos.");
    expect(mocks.profileCalls).toBe(0);
  });

  it("un administrador y un estudiante inician sesion", async () => {
    for (const role of ["admin", "student"]) {
      mocks.account = { id: "1", rut: "12345678-5", password: "h", role, enabled: true };

      const { status, json } = await login();

      expect(status).toBe(200);
      expect(json.data.role).toBe(role);
    }
  });
});
