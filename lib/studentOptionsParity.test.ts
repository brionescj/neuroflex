import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { REGIONS } from "./region";
import { GENDERS, MAX_STUDENT_AGE, MIN_STUDENT_AGE, UNIVERSITIES } from "./studentFields";

// El servidor no importa codigo del navegador: se lee el archivo del frontend
// como texto para comprobar que ofrece exactamente los mismos valores.
const source = readFileSync("src/config/studentOptions.ts", "utf8");

function valuesIn(block: "GENDER_OPTIONS" | "UNIVERSITY_OPTIONS" | "REGION_OPTIONS"): string[] {
  const start = source.indexOf(`export const ${block}`);
  const end = source.indexOf("];", start);

  return [...source.slice(start, end).matchAll(/value: ("(?:[^"\\]|\\.)*")/g)].map(
    (m) => JSON.parse(m[1] as string) as string,
  );
}

describe("opciones de la ficha del estudiante: servidor y navegador coinciden", () => {
  it("generos", () => {
    expect(valuesIn("GENDER_OPTIONS")).toEqual([...GENDERS]);
  });

  it("universidades", () => {
    expect(valuesIn("UNIVERSITY_OPTIONS")).toEqual([...UNIVERSITIES]);
  });

  it("regiones, en el mismo orden", () => {
    expect(valuesIn("REGION_OPTIONS")).toEqual([...REGIONS]);
  });

  it("los tipos del frontend declaran los mismos valores", () => {
    const types = readFileSync("src/types/common.ts", "utf8");

    for (const value of [...GENDERS, ...UNIVERSITIES]) {
      expect(types, value).toContain(`"${value}"`);
    }
  });
});

describe("edad permitida", () => {
  it("el navegador y el servidor aceptan la misma edad", () => {
    expect(source).toContain(`export const MIN_STUDENT_AGE = ${MIN_STUDENT_AGE};`);
    expect(source).toContain(`export const MAX_STUDENT_AGE = ${MAX_STUDENT_AGE};`);
  });
});
