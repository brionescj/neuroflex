import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetRequests, peekShared, prefetchOnce, sharedRequest, takePrefetched } from "./sharedRequest";

const ok = (n: number) => ({ success: true as const, n });
const bad = { success: false as const };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
  forgetRequests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("sharedRequest", () => {
  it("reutiliza una peticion reciente o en curso", async () => {
    const load = vi.fn(async () => ok(1));

    const a = sharedRequest("k", load, 1000);
    const b = sharedRequest("k", load, 1000);

    expect(b).toBe(a);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("pasado el plazo vuelve a pedir", async () => {
    const load = vi.fn(async () => ok(1));

    await sharedRequest("k", load, 1000);
    vi.setSystemTime(Date.now() + 1001);
    await sharedRequest("k", load, 1000);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it("no guarda una respuesta con error ni un rechazo", async () => {
    const load = vi.fn().mockResolvedValueOnce(bad).mockRejectedValueOnce(new Error("x")).mockResolvedValue(ok(3));

    await sharedRequest("k", load, 1000);
    await Promise.resolve();
    await expect(sharedRequest("k", load, 1000)).rejects.toThrow("x");
    await Promise.resolve();
    await expect(sharedRequest("k", load, 1000)).resolves.toEqual(ok(3));

    expect(load).toHaveBeenCalledTimes(3);
  });

  it("peekShared devuelve lo vigente sin pedir nada", async () => {
    const load = vi.fn(async () => ok(1));

    expect(peekShared("k")).toBeUndefined();

    await sharedRequest("k", load, 1000);

    await expect(peekShared("k")).resolves.toEqual(ok(1));
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe("prefetchOnce / takePrefetched", () => {
  it("lo pedido por adelantado se recoge una sola vez", async () => {
    const load = vi.fn(async () => ok(7));

    prefetchOnce("p", load, 60_000);

    await expect(takePrefetched("p")).resolves.toEqual(ok(7));
    expect(takePrefetched("p")).toBeUndefined();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("no pide dos veces si ya hay uno vigente", async () => {
    const load = vi.fn(async () => ok(7));

    prefetchOnce("p", load, 60_000);
    prefetchOnce("p", load, 60_000);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("pasado su plazo ya no se entrega (podria estar desactualizado)", async () => {
    prefetchOnce("p", async () => ok(7), 1000);
    vi.setSystemTime(Date.now() + 1001);

    expect(takePrefetched("p")).toBeUndefined();
  });

  it("una respuesta con error no queda para recoger", async () => {
    prefetchOnce("p", async () => bad, 60_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(takePrefetched("p")).toBeUndefined();
  });
});

describe("forgetRequests", () => {
  it("vacia todo, o solo lo que empieza por un prefijo", async () => {
    await sharedRequest("a:1", async () => ok(1), 1000);
    await sharedRequest("b:1", async () => ok(1), 1000);

    forgetRequests("a:");

    expect(peekShared("a:1")).toBeUndefined();
    expect(peekShared("b:1")).toBeDefined();

    forgetRequests();

    expect(peekShared("b:1")).toBeUndefined();
  });
});
