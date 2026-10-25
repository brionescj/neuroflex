import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// loadData importa los modelos de Mongoose; aqui solo se prueba la reutilizacion.
vi.mock("../models/GameAttempt", () => ({ GameAttempt: {} }));
vi.mock("../models/GameLevelResult", () => ({ GameLevelResult: {} }));
vi.mock("../models/GameUnlock", () => ({ GameUnlock: {} }));
vi.mock("../models/MiniCase", () => ({ MiniCase: {} }));
vi.mock("../models/Student", () => ({ Student: {} }));

import { DATA_REUSE_MS, forgetReusable, reusePromise } from "./loadData";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
  forgetReusable();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("reusePromise", () => {
  it("dos peticiones iguales seguidas comparten una sola lectura", async () => {
    const load = vi.fn(async () => ({ n: 1 }));

    const a = reusePromise("k", load);
    const b = reusePromise("k", load);

    expect(b).toBe(a);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("claves distintas leen por separado", async () => {
    const load = vi.fn(async () => 1);

    await reusePromise("a", load);
    await reusePromise("b", load);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it("pasado el plazo se vuelve a leer, para que un dato nuevo termine por verse", async () => {
    const load = vi.fn(async () => 1);

    await reusePromise("k", load);
    vi.setSystemTime(Date.now() + DATA_REUSE_MS + 1);
    await reusePromise("k", load);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it("una lectura fallida no se reutiliza", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("base caida")).mockResolvedValueOnce("ok");

    await expect(reusePromise("k", load)).rejects.toThrow("base caida");
    await Promise.resolve();

    await expect(reusePromise("k", load)).resolves.toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
