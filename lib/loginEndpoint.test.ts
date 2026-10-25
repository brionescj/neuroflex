import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = "secreto-de-prueba";

  return {
    account: null as Record<string, unknown> | null,
    profile: null as Record<string, unknown> | null,
    passwordOk: true,
    unlocked: undefined as { miniCases: true } | undefined,
    /** Orden en que ocurrieron las lecturas, para comprobar que van a la vez. */
    events: [] as string[],
  };
});

vi.mock("./db", () => ({ connectDB: async () => undefined }));
vi.mock("./unlockedGames", () => ({ findUnlockedGames: async () => mocks.unlocked }));
vi.mock("./findAccount", () => ({ findAccount: async () => mocks.account }));
vi.mock("./findProfile", () => ({
  findSessionProfile: async () => {
    mocks.events.push("profile:start");
    await Promise.resolve();
    mocks.events.push("profile:end");

    return mocks.profile;
  },
}));
vi.mock("./password", () => ({
  verifyPassword: async () => {
    mocks.events.push("password:start");
    await new Promise((resolve) => setTimeout(resolve, 5));
    mocks.events.push("password:end");

    return mocks.passwordOk;
  },
}));

import loginHandler from "./handlers/auth/login";

function login(body: unknown) {
  let status = 0;
  let json: Record<string, any> = {};
  const headers: Record<string, unknown> = {};

  const res = {
    status(code: number) {
      status = code;

      return this;
    },
    json(payload: Record<string, unknown>) {
      json = payload;

      return this;
    },
    setHeader(name: string, value: unknown) {
      headers[name] = value;

      return this;
    },
  } as unknown as VercelResponse;

  const req = { method: "POST", body, headers: {} } as unknown as VercelRequest;

  return Promise.resolve(loginHandler(req, res)).then(() => ({ status, json, headers }));
}

const GOOD = { rut: "12345678-5", password: "Clave#Buena26" };

beforeEach(() => {
  mocks.account = { id: "a1", rut: "12345678-5", password: "hash", role: "student", enabled: true };
  mocks.profile = { firstName: "Ana", paternalLastName: "Pérez", avatarId: "cat", enabled: true };
  mocks.passwordOk = true;
  mocks.unlocked = undefined;
  mocks.events = [];
});

describe("POST auth/login", () => {
  it("con datos correctos abre la sesion y devuelve el usuario", async () => {
    const { status, json, headers } = await login(GOOD);

    expect(status).toBe(200);
    expect(json.data).toEqual({ id: "a1", rut: "12345678-5", role: "student", displayName: "Ana Pérez", avatarId: "cat" });
    const cookies = headers["Set-Cookie"] as string[];

    expect(cookies.find((c) => c.startsWith("neuroflex_session="))).toContain("HttpOnly");
    // La cookie auxiliar avisa que hay sesion y NO es httpOnly (el navegador la lee); no lleva el token.
    const hint = cookies.find((c) => c.startsWith("neuroflex_hint="));
    expect(hint).toBeDefined();
    expect(hint).not.toContain("HttpOnly");
    expect(hint).not.toContain(cookies[0]!.split(";")[0]!.split("=")[1]!);
  });

  it("adelanta los desbloqueos ya registrados junto con la sesion; sin ellos no agrega nada", async () => {
    expect((await login(GOOD)).json.data.unlocked).toBeUndefined();

    mocks.unlocked = { miniCases: true };

    expect((await login(GOOD)).json.data.unlocked).toEqual({ miniCases: true });
  });

  it("con la contraseña incorrecta no entrega desbloqueos", async () => {
    mocks.unlocked = { miniCases: true };
    mocks.passwordOk = false;

    const { json } = await login(GOOD);

    expect(json.data).toBeUndefined();
  });

  it("la contraseña y la ficha se consultan a la vez, no una despues de la otra", async () => {
    await login(GOOD);

    // La ficha ya empezo (y hasta termino) mientras la contraseña aun se comprobaba.
    expect(mocks.events.indexOf("profile:start")).toBeLessThan(mocks.events.indexOf("password:end"));
  });

  it("con la contraseña incorrecta responde 401 y no abre sesion aunque la ficha exista", async () => {
    mocks.passwordOk = false;

    const { status, json, headers } = await login(GOOD);

    expect(status).toBe(401);
    expect(json.message).toBe("RUT o contraseña incorrectos.");
    expect(headers["Set-Cookie"]).toBeUndefined();
  });

  it("un RUT que no existe responde igual que una contraseña incorrecta", async () => {
    mocks.account = null;

    const { status, json } = await login(GOOD);

    expect(status).toBe(401);
    expect(json.message).toBe("RUT o contraseña incorrectos.");
  });

  it("una cuenta deshabilitada con la contraseña correcta recibe 403", async () => {
    mocks.account = { ...mocks.account, enabled: false };

    expect((await login(GOOD)).status).toBe(403);
  });

  it("una cuenta deshabilitada con la contraseña incorrecta sigue recibiendo 401 (no revela el estado)", async () => {
    mocks.account = { ...mocks.account, enabled: false };
    mocks.passwordOk = false;

    expect((await login(GOOD)).status).toBe(401);
  });

  it("sin ficha responde 404 y con la ficha inactiva responde 403", async () => {
    mocks.profile = null;
    expect((await login(GOOD)).status).toBe(404);

    mocks.profile = { firstName: "Ana", paternalLastName: "Pérez", avatarId: "cat", enabled: false };
    expect((await login(GOOD)).status).toBe(403);
  });

  it("un cuerpo sin RUT o sin contraseña responde 401 en vez de fallar", async () => {
    expect((await login({ rut: "12345678-5" })).status).toBe(401);
    expect((await login({ password: "x" })).status).toBe(401);
    expect((await login(undefined)).status).toBe(401);
  });
});
