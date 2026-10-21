import { describe, expect, it } from "vitest";

import { formatBirthDate, toInputDate } from "./birthDate";

describe("toInputDate", () => {
  it("deja AAAA-MM-DD y convierte DD-MM-AAAA, con - o /", () => {
    expect(toInputDate("2001-03-15")).toBe("2001-03-15");
    expect(toInputDate("15-03-2001")).toBe("2001-03-15");
    expect(toInputDate("5/3/2001")).toBe("2001-03-05");
    expect(toInputDate("2001-3-5")).toBe("2001-03-05");
    expect(toInputDate("2001-03-15T00:00:00.000Z")).toBe("2001-03-15");
  });

  it("lo que no se entiende, o no existe, queda vacio", () => {
    expect(toInputDate(undefined)).toBe("");
    expect(toInputDate("")).toBe("");
    expect(toInputDate("ayer")).toBe("");
  });
});

describe("formatBirthDate", () => {
  it("muestra DD-MM-AAAA", () => {
    expect(formatBirthDate("2001-03-15")).toBe("15-03-2001");
    expect(formatBirthDate("5/3/2001")).toBe("05-03-2001");
  });

  it("si no se entiende lo muestra tal cual, y sin dato no muestra nada", () => {
    expect(formatBirthDate("marzo 2001")).toBe("marzo 2001");
    expect(formatBirthDate(undefined)).toBeUndefined();
    expect(formatBirthDate("  ")).toBeUndefined();
  });
});
