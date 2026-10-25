import type { VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => {
  process.env.JWT_SECRET = "secreto-de-prueba";

  return { accounts: new Map<string, { sessionId?: string }>(), reads: 0 };
});

vi.mock("./models/AuthUser", () => ({
  AuthUser: {
    updateOne: async (filter: { rut: string }, update: { $set: { sessionId: string } }) => {
      store.accounts.set(filter.rut, { ...store.accounts.get(filter.rut), ...update.$set });
    },
    findOne: (filter: { rut: string }) => ({
      select: () => ({
        lean: async () => {
          store.reads += 1;

          return store.accounts.get(filter.rut) ?? null;
        },
      }),
    }),
  },
}));

import {
  ensureCurrentSession,
  forgetKnownSessions,
  isCurrentSession,
  startStudentSession,
} from "./sessions";

const student = (sid?: string) => ({ id: "1", rut: "11111111-1", role: "student" as const, ...(sid ? { sid } : {}) });

function response() {
  const out = { status: 0, json: {} as Record<string, unknown>, headers: {} as Record<string, unknown> };
  const res = {
    status(code: number) {
      out.status = code;

      return this;
    },
    json(body: Record<string, unknown>) {
      out.json = body;

      return this;
    },
    setHeader(name: string, value: unknown) {
      out.headers[name] = value;

      return this;
    },
  } as unknown as VercelResponse;

  return { res, out };
}

beforeEach(() => {
  store.accounts.clear();
  store.reads = 0;
  forgetKnownSessions();
});

describe("sesion unica del estudiante", () => {
  it("un inicio de sesion nuevo deja sin efecto el anterior", async () => {
    const first = await startStudentSession("11111111-1");
    const second = await startStudentSession("11111111-1");

    expect(first).not.toBe(second);

    forgetKnownSessions();

    expect(await isCurrentSession(student(first))).toBe(false);
    expect(await isCurrentSession(student(second))).toBe(true);
  });

  it("una sesion recien abierta nunca se rechaza, aunque antes se hubiera recordado la anterior", async () => {
    const first = await startStudentSession("11111111-1");

    expect(await isCurrentSession(student(first))).toBe(true);

    const second = await startStudentSession("11111111-1");

    // La anterior ya no vale, ni siquiera dentro del plazo en que se recuerdan las vigentes.
    expect(await isCurrentSession(student(first))).toBe(false);
    expect(await isCurrentSession(student(second))).toBe(true);
  });

  it("los administradores pueden tener varias sesiones: nunca se consulta nada", async () => {
    store.accounts.set("99999999-9", { sessionId: "otra" });

    expect(await isCurrentSession({ id: "2", rut: "99999999-9", role: "admin" })).toBe(true);
    expect(store.reads).toBe(0);
  });

  it("un token anterior al control (sin sid) vale hasta que la cuenta abre una sesion nueva", async () => {
    expect(await isCurrentSession(student())).toBe(true);

    await startStudentSession("11111111-1");
    forgetKnownSessions();

    expect(await isCurrentSession(student())).toBe(false);
  });

  it("lo vigente se recuerda unos segundos: la segunda comprobacion no vuelve a la base", async () => {
    const sid = await startStudentSession("11111111-1");

    forgetKnownSessions();
    await isCurrentSession(student(sid));
    await isCurrentSession(student(sid));

    expect(store.reads).toBe(1);
  });

  it("una sesion reemplazada responde 401 con el codigo que reconoce el navegador y borra la cookie", async () => {
    const old = await startStudentSession("11111111-1");

    await startStudentSession("11111111-1");
    forgetKnownSessions();

    const { res, out } = response();

    expect(await ensureCurrentSession(student(old), res)).toBe(false);
    expect(out.status).toBe(401);
    expect(out.json.code).toBe("session-replaced");
    expect(String(out.json.message)).toContain("otro dispositivo");
    expect(JSON.stringify(out.headers)).toContain("Max-Age=0");
  });

  it("la sesion vigente puede seguir", async () => {
    const sid = await startStudentSession("11111111-1");
    const { res, out } = response();

    forgetKnownSessions();

    expect(await ensureCurrentSession(student(sid), res)).toBe(true);
    expect(out.status).toBe(0);
  });
});
