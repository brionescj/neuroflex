import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadGameAccess = vi.hoisted(() => vi.fn());

vi.mock("./gameAccess.service", () => ({ loadGameAccess }));

import { REUSE_MS, requestGameAccess } from "./gameAccess.warm";

const ok = (miniCases: boolean) => ({ success: true as const, message: "ok", data: { miniCases } });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
  loadGameAccess.mockReset();
  loadGameAccess.mockResolvedValue(ok(true));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("requestGameAccess", () => {
  it("dos pedidos seguidos del mismo estudiante comparten una sola consulta", async () => {
    const a = requestGameAccess("11111111-1");
    const b = requestGameAccess("11111111-1");

    expect(b).toBe(a);
    expect(loadGameAccess).toHaveBeenCalledTimes(1);
  });

  it("cada estudiante tiene su propia consulta (nunca se comparte entre personas)", async () => {
    await requestGameAccess("22222222-2");
    await requestGameAccess("33333333-3");

    expect(loadGameAccess).toHaveBeenCalledTimes(2);
  });

  it("pasado el tiempo de reutilizacion se vuelve a preguntar al servidor", async () => {
    await requestGameAccess("44444444-4");
    vi.setSystemTime(Date.now() + REUSE_MS + 1);
    await requestGameAccess("44444444-4");

    expect(loadGameAccess).toHaveBeenCalledTimes(2);
  });

  it("un reintento (reuseMs 0) siempre pregunta de nuevo", async () => {
    await requestGameAccess("55555555-5");
    await requestGameAccess("55555555-5", 0);

    expect(loadGameAccess).toHaveBeenCalledTimes(2);
  });

  it("una respuesta con error no se reutiliza", async () => {
    loadGameAccess.mockResolvedValueOnce({ success: false, message: "caido" });

    await requestGameAccess("66666666-6");
    await Promise.resolve();
    await requestGameAccess("66666666-6");

    expect(loadGameAccess).toHaveBeenCalledTimes(2);
  });
});
