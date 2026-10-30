import { describe, expect, it } from "vitest";

import type { AdminMiniCase } from "@/types";

import {
  EMPTY_ALTERNATE_ORDER,
  alternateStepsToSend,
  DEFAULT_PROMPT_TEXT,
  initialMiniCaseState,
  miniCaseFormProblem,
  miniCaseFullTitle,
  miniCaseLabel,
  miniCaseNumber,
} from "./miniCaseForm";

const saved: AdminMiniCase = {
  caseKey: "caso-13",
  title: "Área de Conducta y Autorregulación",
  imageKey: "rincon-calma",
  baseText: "Caso.",
  twistText: "¡Alerta de Cambio! Algo.",
  promptText: "Ordena:",
  feedback: "Porque sí.",
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

  it("el panel rotula cada caso «Mini Caso N: nombre» a partir de su clave", () => {
    expect(miniCaseNumber("caso-12")).toBe(12);
    expect(miniCaseLabel("caso-3")).toBe("Mini Caso 3");
    expect(miniCaseFullTitle("caso-1", "Área de Detección Temprana")).toBe("Mini Caso 1: Área de Detección Temprana");
  });

  it("un caso antiguo sin imagen usa la predeterminada", () => {
    expect(initialMiniCaseState({ ...saved, imageKey: undefined }).imageKey).toBe("aula");
  });

  it("rechaza un título con «Mini Caso» y alternativas vacías o repetidas", () => {
    const base = initialMiniCaseState(saved);

    expect(miniCaseFormProblem({ ...base, title: "Mini Caso 12: Lenguaje" })).toMatch(/solo el nombre del área/);
    expect(
      miniCaseFormProblem({ ...base, options: base.options.map((o, i) => (i === 2 ? { ...o, text: "  " } : o)) }),
    ).toMatch(/4 alternativas/);
    expect(
      miniCaseFormProblem({ ...base, options: base.options.map((o) => ({ ...o, text: "Igual" })) }),
    ).toMatch(/iguales/);
    expect(miniCaseFormProblem({ ...base, feedback: " " })).toMatch(/retroalimentación/);
  });

  describe("otros órdenes correctos", () => {
    const withAlternate: AdminMiniCase = {
      ...saved,
      // En el orden principal: B(1) D(2) A(3) C(4). Otro orden válido: A, B, D, C = pasos 3, 1, 2, 4.
      alternateOrders: [["caso-13-a", "caso-13-b", "caso-13-d", "caso-13-c"]],
    };

    it("un caso con otro orden lo muestra marcado y como lugares del orden principal", () => {
      const state = initialMiniCaseState(withAlternate);

      expect(state.acceptsOtherOrders).toBe(true);
      expect(state.alternateOrders).toEqual([[3, 1, 2, 4]]);
      expect(alternateStepsToSend(state)).toEqual([[3, 1, 2, 4]]);
      expect(miniCaseFormProblem(state)).toBeNull();
    });

    it("un caso sin otros órdenes parte con la casilla desmarcada y no envía ninguno", () => {
      const state = initialMiniCaseState(saved);

      expect(state.acceptsOtherOrders).toBe(false);
      expect(alternateStepsToSend(state)).toEqual([]);
    });

    it("desmarcar la casilla envía una lista vacía: quita los órdenes que tenía", () => {
      const state = { ...initialMiniCaseState(withAlternate), acceptsOtherOrders: false };

      expect(alternateStepsToSend(state)).toEqual([]);
      expect(miniCaseFormProblem(state)).toBeNull();
    });

    it("rechaza un orden incompleto, con alternativas repetidas, igual al principal o repetido", () => {
      const base = { ...initialMiniCaseState(saved), acceptsOtherOrders: true };
      const problem = (alternateOrders: (number | null)[][]) => miniCaseFormProblem({ ...base, alternateOrders });

      expect(problem([])).toMatch(/Agrega el otro orden/);
      expect(problem([[...EMPTY_ALTERNATE_ORDER]])).toMatch(/incompleto/);
      expect(problem([[1, 1, 2, 3]])).toMatch(/repite una alternativa/);
      expect(problem([[1, 2, 3, 4]])).toMatch(/igual al orden principal/);
      expect(problem([[2, 1, 3, 4], [2, 1, 3, 4]])).toMatch(/orden correcto adicional 2 repite/);
      expect(problem([[2, 1, 3, 4]])).toBeNull();
    });
  });
});
