import { describe, expect, it } from "vitest";
import {
  calculateDV,
  formatRut,
  isValidRut,
  normalizeForDatabase,
} from "@/utils/rut";

describe("calculateDV", () => {
  it("calcula un digito verificador numerico", () => {
    expect(calculateDV("12345678")).toBe("5");
  });

  it("calcula K cuando el resto es 10", () => {
    expect(calculateDV("20000003")).toBe("K");
  });

  it("calcula 0 cuando el resto es 11", () => {
    expect(calculateDV("10000004")).toBe("0");
  });
});

describe("isValidRut", () => {
  it("acepta un RUT valido con DV numerico", () => {
    expect(isValidRut("12345678-5")).toBe(true);
  });

  it("acepta un RUT valido con DV K, con puntos y k minuscula", () => {
    expect(isValidRut("20.000.003-k")).toBe(true);
  });

  it("acepta un RUT valido con DV 0", () => {
    expect(isValidRut("10000004-0")).toBe(true);
  });

  it("rechaza un RUT con DV incorrecto", () => {
    expect(isValidRut("12345678-9")).toBe(false);
  });

  it("rechaza un cuerpo no numerico", () => {
    expect(isValidRut("abcdefgh-5")).toBe(false);
  });

  it("rechaza un RUT sin guion", () => {
    expect(isValidRut("123456785")).toBe(false);
  });

  it("rechaza un string vacio", () => {
    expect(isValidRut("")).toBe(false);
  });
});

describe("normalizeForDatabase", () => {
  it("elimina puntos y mantiene el guion", () => {
    expect(normalizeForDatabase("12.345.678-5")).toBe("12345678-5");
  });

  it("agrega el guion y pone la K en mayuscula cuando el DV es K", () => {
    expect(normalizeForDatabase("20000003k")).toBe("20000003-K");
  });

  it("mantiene el DV 0", () => {
    expect(normalizeForDatabase("10.000.004-0")).toBe("10000004-0");
  });
});

describe("formatRut", () => {
  it("agrega puntos de miles y guion a un RUT con DV K", () => {
    expect(formatRut("20000003-K")).toBe("20.000.003-K");
  });

  it("agrega puntos de miles y guion a un RUT con DV 0", () => {
    expect(formatRut("10000004-0")).toBe("10.000.004-0");
  });
});
