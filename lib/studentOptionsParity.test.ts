import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { GENDERS, UNIVERSITIES } from "./studentFields";

// El servidor no importa codigo del navegador: se lee el archivo del frontend
// como texto para comprobar que ofrece exactamente los mismos valores.
const source = readFileSync("src/config/studentOptions.ts", "utf8");

function valuesIn(block: "GENDER_OPTIONS" | "UNIVERSITY_OPTIONS"): string[] {
  const start = source.indexOf(`export const ${block}`);
  const end = source.indexOf("];", start);

  return [...source.slice(start, end).matchAll(/value: "([^"]+)"/g)].map((m) => m[1] as string);
}

describe("opciones de la ficha del estudiante: servidor y navegador coinciden", () => {
  it("generos", () => {
    expect(valuesIn("GENDER_OPTIONS")).toEqual([...GENDERS]);
  });

  it("universidades", () => {
    expect(valuesIn("UNIVERSITY_OPTIONS")).toEqual([...UNIVERSITIES]);
  });

  it("los tipos del frontend declaran los mismos valores", () => {
    const types = readFileSync("src/types/common.ts", "utf8");

    for (const value of [...GENDERS, ...UNIVERSITIES]) {
      expect(types, value).toContain(`"${value}"`);
    }
  });
});
