import { describe, expect, it } from "vitest";

import { MINI_CASES_SEED } from "./miniCasesSeed";
import { isMiniCaseImageKey } from "./miniCaseImages";
import { parseMiniCaseInput } from "./miniCaseInput";
import { validateAlternateOrders } from "./miniCaseScoring";

describe("banco de mini casos (seed)", () => {
  it("tiene los 25 casos, con claves caso-1 a caso-25", () => {
    expect(MINI_CASES_SEED.map((c) => c.caseKey)).toEqual(
      Array.from({ length: 25 }, (_, i) => `caso-${i + 1}`),
    );
  });

  it("el título es solo el área: sin «Mini Caso» y empieza con «Área de»", () => {
    for (const c of MINI_CASES_SEED) {
      expect(c.title, c.caseKey).not.toMatch(/mini\s*caso/i);
      expect(c.title, c.caseKey).toMatch(/^Área de /);
    }
  });

  it("los casos 1 a 10 llevan los nombres de área del documento «JUEGOS ABSTRACTOS - FE»", () => {
    expect(MINI_CASES_SEED.slice(0, 10).map((c) => c.title)).toEqual([
      "Área de Detección Temprana",
      "Área de Co-enseñanza",
      "Área de Estrategias Inclusivas (DUA)",
      "Área de Apoyos Específicos (TEA)",
      "Área de Evaluación Inclusiva",
      "Área de Interculturalidad e Igualdad",
      "Área de Co-regulación Emocional",
      "Área de Co-enseñanza Matemática",
      "Área de Ruta de Derivación Interna",
      "Área de Acceso Curricular (Proyectos)",
    ]);
  });

  it("cada caso trae una imagen del catálogo", () => {
    for (const c of MINI_CASES_SEED) expect(isMiniCaseImageKey(c.imageKey), c.caseKey).toBe(true);
  });

  it("cada caso pasa la misma validación que el formulario del administrador", () => {
    for (const c of MINI_CASES_SEED) {
      const parsed = parseMiniCaseInput(c);

      expect(parsed.ok, `${c.caseKey}: ${parsed.ok ? "" : parsed.message}`).toBe(true);
      expect(validateAlternateOrders(c.options, c.alternateOrders), c.caseKey).toBeNull();
    }
  });

  it("las claves de las alternativas son únicas en todo el banco", () => {
    const keys = MINI_CASES_SEED.flatMap((c) => c.options.map((o) => o.optionKey));

    expect(new Set(keys).size).toBe(100);
  });

  it("la alerta de cambio empieza con el aviso y no arrastra el paréntesis de los distractores", () => {
    for (const c of MINI_CASES_SEED) {
      expect(c.twistText, c.caseKey).toMatch(/^¡Alerta de Cambio!/);
      expect(c.twistText, c.caseKey).not.toMatch(/Aparece con/);
    }
  });

  it("caso 12: el orden es 4-3-2-1 (la clave del documento lista números de alternativa)", () => {
    const c = MINI_CASES_SEED[11]!;

    expect(c.options.map((o) => o.correctStep)).toEqual([4, 3, 2, 1]);
  });

  it("caso 13: clave 2-4-1-3 → la alternativa 2 va primero y la 3 al final", () => {
    const c = MINI_CASES_SEED[12]!;

    expect(c.options.map((o) => o.correctStep)).toEqual([3, 1, 4, 2]);
    expect(c.options[1]!.text).toMatch(/^Recordar los parámetros/);
  });
});
