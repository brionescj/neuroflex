import type { VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

import { addDbTime, runTimed } from "./timing";

function fakeRes() {
  const headers: Record<string, string> = {};
  const sent: unknown[][] = [];
  const res = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
    writeHead: (...args: unknown[]) => {
      sent.push(args);
    },
  } as unknown as VercelResponse;

  return { res, headers, sent };
}

describe("Server-Timing", () => {
  it("agrega la cabecera con el total y el tiempo en la base justo antes de enviar", async () => {
    const { res, headers, sent } = fakeRes();

    await runTimed(res, "GET prueba", async () => {
      addDbTime(120);
      addDbTime(30);
      res.writeHead(200);
    });

    expect(sent).toEqual([[200]]);
    expect(headers["Server-Timing"]).toMatch(/total;dur=\d+/);
    expect(headers["Server-Timing"]).toContain("db;dur=150");
  });

  it("solo la primera peticion del proceso se marca como arranque en frio", async () => {
    // Esta suite ya hizo una peticion arriba: ninguna de las siguientes es la primera.
    const { res, headers } = fakeRes();

    await runTimed(res, "GET otra", async () => {
      res.writeHead(200);
    });

    expect(headers["Server-Timing"]).not.toContain("arranque");
  });

  it("deja anotada en el registro una peticion lenta, con su causa", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { res } = fakeRes();
    const clock = vi.spyOn(performance, "now");

    clock.mockReturnValueOnce(0); // inicio
    clock.mockReturnValue(7500); // al enviar

    await runTimed(res, "GET admin/stats/catalog", async () => {
      addDbTime(6200);
      res.writeHead(200);
    });

    clock.mockRestore();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain("[lento] GET admin/stats/catalog 7500 ms");
    expect(String(warn.mock.calls[0]![0])).toContain("base de datos 6200 ms");

    warn.mockRestore();
  });

  it("un tiempo de base fuera de una peticion no falla", () => {
    expect(() => addDbTime(10)).not.toThrow();
  });
});
