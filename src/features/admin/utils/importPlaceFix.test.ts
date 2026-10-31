import { describe, expect, it } from "vitest";

import type { StudentImportRow, StudentImportRowResult } from "@/types";

import { applyPlaceFix, hasPlaceWarning, isPlaceWarning } from "./importPlaceFix";

const row = (n: number, region: string, comuna: string): StudentImportRow => ({
  row: n,
  nombre: "A",
  rut: "1-9",
  fechaNacimiento: "",
  email: "",
  celular: "",
  comuna,
  region,
  jornada: "",
  genero: "",
});

describe("isPlaceWarning / hasPlaceWarning", () => {
  it("solo la región y la comuna se pueden corregir a mano", () => {
    expect(isPlaceWarning("Región: «X» no es una región de Chile.")).toBe(true);
    expect(isPlaceWarning("Comuna: «X» no es una comuna de Chile.")).toBe(true);
    expect(isPlaceWarning("Correo: Falta el @ en el correo.")).toBe(false);
  });

  it("una fila con varios avisos cuenta si alguno es de lugar", () => {
    const result = (warnings: string[]): StudentImportRowResult => ({ row: 2, status: "ready", warnings });

    expect(hasPlaceWarning(result(["Correo: mal", "Región: «X» no es una región de Chile."]))).toBe(true);
    expect(hasPlaceWarning(result(["Correo: mal"]))).toBe(false);
    expect(hasPlaceWarning(result([]))).toBe(false);
  });
});

describe("applyPlaceFix", () => {
  const rows = [row(2, "Mordor", "Hobbiton"), row(3, "Biobío", "Concepción")];

  it("cambia solo región y comuna de esa fila", () => {
    const next = applyPlaceFix(rows, 2, { region: "Maule", comuna: "Talca" });

    expect(next[0]).toEqual({ ...rows[0], region: "Maule", comuna: "Talca" });
    expect(next[1]).toBe(rows[1]);
  });

  it("no modifica el arreglo original y acepta dejar ambas sin rellenar", () => {
    const next = applyPlaceFix(rows, 3, { region: "", comuna: "" });

    expect(next[1]).toMatchObject({ region: "", comuna: "" });
    expect(rows[1]).toMatchObject({ region: "Biobío", comuna: "Concepción" });
  });
});
