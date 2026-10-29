import { describe, expect, it } from "vitest";

import type { AdminMiniCase } from "@/types";

import { DEFAULT_PROMPT_TEXT, initialMiniCaseState, miniCaseFormProblem } from "./miniCaseForm";

const saved: AdminMiniCase = {
  caseKey: "caso-13",
  title: "Área de Conducta y Autorregulación",
  imageKey: "rincon-calma",
  baseText: "Caso.",
  twistText: "¡Alerta de Cambio! Algo.",
  promptText: "Ordena:",
  feedback: "Porque sí.",
  enabled: true,
  options: [
    { optionKey: "caso-13-a", text: "A (paso 3)", correctStep: 3 },
    { optionKey: "caso-13-b", text: "B (paso 1)", correctStep: 1 },
    { optionKey: "caso-13-c", text: "C (paso 4)", correctStep: 4 },
    { optionKey: "caso-13-d", text: "D (paso 2)", correctStep: 2 },
  ],
};

describe("formulario de mini casos", () => {
  it("un caso nuevo parte vacío, con la consigna habitual y la imagen predeterminada", () => {
    const state = initialMiniCaseState(undefined);

    expect(state.promptText).toBe(DEFAULT_PROMPT_TEXT);
    expect(state.imageKey).toBe("aula");
    expect(state.options).toHaveLength(4);
    expect(miniCaseFormProblem(state)).toMatch(/título/i);
  });

  it("al editar, las alternativas quedan en el orden correcto y conservan su clave", () => {
    const state = initialMiniCaseState(saved);

    expect(state.options.map((o) => o.text)).toEqual(["B (paso 1)", "D (paso 2)", "A (paso 3)", "C (paso 4)"]);
    expect(state.options.map((o) => o.optionKey)).toEqual(["caso-13-b", "caso-13-d", "caso-13-a", "caso-13-c"]);
    expect(state.imageKey).toBe("rincon-calma");
    expect(miniCaseFormProblem(state)).toBeNull();
  });

  it("un caso antiguo sin imagen usa la predeterminada", () => {
    expect(initialMiniCaseState({ ...saved, imageKey: undefined }).imageKey).toBe("aula");
  });

  it("rechaza un título con «Mini Caso» y alternativas vacías o repetidas", () => {
    const base = initialMiniCaseState(saved);

    expect(miniCaseFormProblem({ ...base, title: "Mini Caso 12: Lenguaje" })).toMatch(/Mini Caso/);
    expect(
      miniCaseFormProblem({ ...base, options: base.options.map((o, i) => (i === 2 ? { ...o, text: "  " } : o)) }),
    ).toMatch(/4 alternativas/);
    expect(
      miniCaseFormProblem({ ...base, options: base.options.map((o) => ({ ...o, text: "Igual" })) }),
    ).toMatch(/iguales/);
    expect(miniCaseFormProblem({ ...base, feedback: " " })).toMatch(/retroalimentación/);
  });
});
