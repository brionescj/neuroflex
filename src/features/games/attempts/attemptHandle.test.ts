import { describe, expect, it } from "vitest";

import {
  optionalIsoDate,
  optionalTimeMs,
  parseAttemptHandle,
} from "./attemptHandle";

describe("parseAttemptHandle", () => {
  const ok = {
    attemptId: "3f6c1d52-9b0a-4c55-8f0e-2b6f2a1c7d11",
    startedAt: "2026-10-14T12:00:00.000Z",
  };

  it("acepta un identificador valido", () => {
    expect(parseAttemptHandle(ok)).toEqual(ok);
  });

  it("devuelve undefined si falta, sin romper", () => {
    expect(parseAttemptHandle(undefined)).toBeUndefined();
    expect(parseAttemptHandle(null)).toBeUndefined();
    expect(parseAttemptHandle("x")).toBeUndefined();
  });

  it("rechaza identificadores con caracteres raros o muy cortos", () => {
    expect(parseAttemptHandle({ ...ok, attemptId: "a b" })).toBeUndefined();
    expect(parseAttemptHandle({ ...ok, attemptId: "abc" })).toBeUndefined();
    expect(parseAttemptHandle({ ...ok, attemptId: 123 })).toBeUndefined();
  });

  it("rechaza una fecha que no se entiende", () => {
    expect(parseAttemptHandle({ ...ok, startedAt: "ayer" })).toBeUndefined();
  });
});

describe("optionalTimeMs", () => {
  it("deja pasar tiempos validos y descarta el resto", () => {
    expect(optionalTimeMs(1500)).toBe(1500);
    expect(optionalTimeMs(0)).toBe(0);
    expect(optionalTimeMs(-1)).toBeUndefined();
    expect(optionalTimeMs(Number.NaN)).toBeUndefined();
    expect(optionalTimeMs("5")).toBeUndefined();
    expect(optionalTimeMs(2 * 24 * 60 * 60 * 1000)).toBeUndefined();
  });
});

describe("optionalIsoDate", () => {
  it("valida fechas", () => {
    expect(optionalIsoDate("2026-10-14T12:00:00Z")).toBe("2026-10-14T12:00:00Z");
    expect(optionalIsoDate("no")).toBeUndefined();
    expect(optionalIsoDate(5)).toBeUndefined();
  });
});
