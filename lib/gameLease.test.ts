import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ leases: new Map<string, string>() }));

const keyOf = (f: { studentRut: string; gameId: string }) => `${f.studentRut}:${f.gameId}`;

vi.mock("./models/GameLease", () => ({
  GameLease: {
    findOneAndUpdate: async (filter: { studentRut: string; gameId: string }, doc: { leaseId: string }) => {
      store.leases.set(keyOf(filter), doc.leaseId);
    },
    findOne: (filter: { studentRut: string; gameId: string }) => ({
      select: () => ({
        lean: async () => {
          const leaseId = store.leases.get(keyOf(filter));

          return leaseId === undefined ? null : { leaseId };
        },
      }),
    }),
  },
}));

import { claimGame, ensureGameHeld, holdsGame, isLeaseId } from "./gameLease";

function call(headers: Record<string, string> = {}) {
  const out = { status: 0, json: {} as Record<string, unknown> };
  const res = {
    status(code: number) {
      out.status = code;

      return this;
    },
    json(body: Record<string, unknown>) {
      out.json = body;

      return this;
    },
  } as unknown as VercelResponse;

  return { req: { headers } as unknown as VercelRequest, res, out };
}

const RUT = "11111111-1";
const A = "pestana-aaaaaaaa";
const B = "pestana-bbbbbbbb";

beforeEach(() => store.leases.clear());

describe("un juego se juega desde un solo lugar", () => {
  it("el ultimo que abre el juego es quien lo tiene", async () => {
    await claimGame(RUT, "color-sequence", A);
    await claimGame(RUT, "color-sequence", B);

    expect(await holdsGame(RUT, "color-sequence", A)).toBe(false);
    expect(await holdsGame(RUT, "color-sequence", B)).toBe(true);
  });

  it("cada juego tiene su propio candado, y cada estudiante el suyo", async () => {
    await claimGame(RUT, "color-sequence", A);
    await claimGame(RUT, "node-connection", B);
    await claimGame("22222222-2", "color-sequence", B);

    expect(await holdsGame(RUT, "color-sequence", A)).toBe(true);
    expect(await holdsGame(RUT, "node-connection", B)).toBe(true);
  });

  it("guardar desde el lugar que perdio el juego da 409 con un codigo reconocible", async () => {
    await claimGame(RUT, "color-sequence", A);
    await claimGame(RUT, "color-sequence", B);

    const { req, res, out } = call({ "x-game-lease": A });

    expect(await ensureGameHeld(req, res, RUT, "color-sequence")).toBe(false);
    expect(out.status).toBe(409);
    expect(out.json.code).toBe("game-opened-elsewhere");
  });

  it("guardar desde el lugar vigente, o sin encabezado, o sin que nadie lo haya reclamado, sigue", async () => {
    await claimGame(RUT, "color-sequence", B);

    for (const [headers, game] of [
      [{ "x-game-lease": B }, "color-sequence"],
      [{}, "color-sequence"],
      [{ "x-game-lease": A }, "node-connection"],
    ] as const) {
      const { req, res, out } = call({ ...headers });

      expect(await ensureGameHeld(req, res, RUT, game)).toBe(true);
      expect(out.status).toBe(0);
    }
  });

  it("un identificador mal formado se trata como perdido", async () => {
    const { req, res, out } = call({ "x-game-lease": "x" });

    expect(await ensureGameHeld(req, res, RUT, "color-sequence")).toBe(false);
    expect(out.status).toBe(409);
    expect(isLeaseId("x")).toBe(false);
    expect(isLeaseId(A)).toBe(true);
  });
});
