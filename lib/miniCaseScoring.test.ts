import { describe, expect, it } from "vitest";

import {
  analyzeMiniCaseOrder,
  isPermutationOfOptions,
  kendallDistance,
  primaryOrder,
  scoreMiniCaseOrder,
  validateAlternateOrders,
  validOrders,
} from "./miniCaseScoring";

const options = [
  { optionKey: "a", correctStep: 1, text: "Adaptar el aula" },
  { optionKey: "b", correctStep: 2, text: "Registrar evidencias" },
  { optionKey: "c", correctStep: 3, text: "Escuchar al apoderado" },
  { optionKey: "d", correctStep: 4, text: "Presentar evidencias" },
];

// Como el caso 9: ademas de a-b-c-d vale c-a-b-d.
const ALT = [["c", "a", "b", "d"]];

describe("scoreMiniCaseOrder (sin secuencias alternativas)", () => {
  it("orden perfecto", () => {
    expect(scoreMiniCaseOrder(options, ["a", "b", "c", "d"])).toEqual({
      correctSteps: 4,
      isFullyCorrect: true,
      matchedSequence: 0,
    });
  });

  it("cuenta solo los pasos en su lugar", () => {
    expect(scoreMiniCaseOrder(options, ["b", "a", "c", "d"])).toEqual({
      correctSteps: 2,
      isFullyCorrect: false,
      matchedSequence: 0,
    });
  });

  it("una opcion desconocida no suma", () => {
    expect(scoreMiniCaseOrder(options, ["x", "b", "c", "d"]).correctSteps).toBe(3);
  });

  it("la secuencia principal sale de correctStep, no del orden del arreglo", () => {
    const shuffled = [options[2]!, options[0]!, options[3]!, options[1]!];

    expect(primaryOrder(shuffled)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("scoreMiniCaseOrder con secuencia alternativa (caso 9)", () => {
  it("la secuencia principal sigue siendo valida", () => {
    expect(scoreMiniCaseOrder(options, ["a", "b", "c", "d"], ALT)).toEqual({
      correctSteps: 4,
      isFullyCorrect: true,
      matchedSequence: 0,
    });
  });

  it("la secuencia alternativa tambien es valida y NO queda como fallida", () => {
    expect(scoreMiniCaseOrder(options, ["c", "a", "b", "d"], ALT)).toEqual({
      correctSteps: 4,
      isFullyCorrect: true,
      matchedSequence: 1,
    });
  });

  it("sin la alternativa, esa misma respuesta contaria solo 1 paso", () => {
    expect(scoreMiniCaseOrder(options, ["c", "a", "b", "d"]).correctSteps).toBe(1);
  });

  it("una respuesta parcial se puntua contra la secuencia que mas coincide", () => {
    // c-a-d-b: con la alternativa acierta c y a (2); con la principal solo... ninguno
    expect(scoreMiniCaseOrder(options, ["c", "a", "d", "b"], ALT)).toMatchObject({
      correctSteps: 2,
      isFullyCorrect: false,
      matchedSequence: 1,
    });

    // a-b-d-c: con la principal acierta a y b (2)
    expect(scoreMiniCaseOrder(options, ["a", "b", "d", "c"], ALT)).toMatchObject({
      correctSteps: 2,
      matchedSequence: 0,
    });
  });

  it("a igualdad gana la secuencia principal", () => {
    // a-a no es posible; c-b-?-d: principal acierta d (1)... se prueba con empate real:
    // [a, c, b, d]: principal acierta a y d (2); alternativa acierta d (1) -> principal.
    expect(scoreMiniCaseOrder(options, ["a", "c", "b", "d"], ALT)).toMatchObject({
      correctSteps: 2,
      matchedSequence: 0,
    });
  });

  it("una respuesta equivocada no se vuelve correcta por tener alternativas", () => {
    expect(scoreMiniCaseOrder(options, ["b", "c", "d", "a"], ALT)).toMatchObject({
      correctSteps: 0,
      isFullyCorrect: false,
    });
  });
});

describe("kendallDistance", () => {
  const ref = ["a", "b", "c", "d"];

  it("0 si esta en orden, 1 si hay dos vecinas cambiadas, 6 si esta invertido", () => {
    expect(kendallDistance(["a", "b", "c", "d"], ref)).toBe(0);
    expect(kendallDistance(["b", "a", "c", "d"], ref)).toBe(1);
    expect(kendallDistance(["d", "c", "b", "a"], ref)).toBe(6);
  });

  it("distingue errores con los mismos pasos en su lugar pero distinta gravedad", () => {
    // ambos dejan 2 pasos en su lugar...
    expect(scoreMiniCaseOrder(options, ["b", "a", "c", "d"]).correctSteps).toBe(2);
    expect(scoreMiniCaseOrder(options, ["d", "b", "c", "a"]).correctSteps).toBe(2);
    // ...pero uno es un cambio de vecinas y el otro mueve los extremos
    expect(kendallDistance(["b", "a", "c", "d"], ref)).toBe(1);
    expect(kendallDistance(["d", "b", "c", "a"], ref)).toBe(5);
  });
});

describe("validateAlternateOrders / isPermutationOfOptions", () => {
  it("acepta ninguna, o una ordenacion completa distinta de la principal", () => {
    expect(validateAlternateOrders(options, undefined)).toBeNull();
    expect(validateAlternateOrders(options, [])).toBeNull();
    expect(validateAlternateOrders(options, ALT)).toBeNull();
  });

  it("rechaza lo que no es una ordenacion completa", () => {
    expect(validateAlternateOrders(options, "c-a-b-d")).not.toBeNull();
    expect(validateAlternateOrders(options, [["c", "a", "b"]])).not.toBeNull();
    expect(validateAlternateOrders(options, [["c", "a", "b", "z"]])).not.toBeNull();
    expect(validateAlternateOrders(options, [["c", "c", "b", "d"]])).not.toBeNull();
    expect(validateAlternateOrders(options, [[1, 2, 3, 4]])).not.toBeNull();
  });

  it("rechaza repetir la principal o repetir una alternativa", () => {
    expect(validateAlternateOrders(options, [["a", "b", "c", "d"]])).not.toBeNull();
    expect(validateAlternateOrders(options, [ALT[0], ALT[0]])).not.toBeNull();
  });

  it("reconoce una permutacion de las opciones", () => {
    expect(isPermutationOfOptions(options, ["d", "c", "b", "a"])).toBe(true);
    expect(isPermutationOfOptions(options, ["a", "a", "b", "c"])).toBe(false);
    expect(isPermutationOfOptions(options, ["a", "b", "c"])).toBe(false);
    expect(isPermutationOfOptions(options, ["a", "b", "c", "x"])).toBe(false);
  });

  it("validOrders pone la principal primero", () => {
    expect(validOrders(options, ALT)).toEqual([["a", "b", "c", "d"], ["c", "a", "b", "d"]]);
  });
});

describe("analyzeMiniCaseOrder", () => {
  it("guarda en que lugar puso el estudiante cada opcion y donde se la mostraron", () => {
    // La pantalla mostro: c, a, d, b. El estudiante eligio: b, a, c, d.
    const analysis = analyzeMiniCaseOrder(
      options,
      [],
      ["b", "a", "c", "d"],
      ["c", "a", "d", "b"],
    );

    expect(analysis.placements).toEqual([
      { step: 1, optionKey: "b", expectedStep: 2, displayedAt: 4 },
      { step: 2, optionKey: "a", expectedStep: 1, displayedAt: 2 },
      { step: 3, optionKey: "c", expectedStep: 3, displayedAt: 1 },
      { step: 4, optionKey: "d", expectedStep: 4, displayedAt: 3 },
    ]);
    expect(analysis.positionCorrect).toEqual([false, false, true, true]);
    expect(analysis.correctSteps).toBe(2);
    expect(analysis.kendallDistance).toBe(1);
  });

  it("guarda el texto de las opciones de ese momento, ordenadas por paso correcto", () => {
    const analysis = analyzeMiniCaseOrder(
      [options[2]!, options[0]!, options[3]!, options[1]!],
      [],
      ["a", "b", "c", "d"],
      null,
    );

    expect(analysis.options).toEqual([
      { optionKey: "a", correctStep: 1, text: "Adaptar el aula" },
      { optionKey: "b", correctStep: 2, text: "Registrar evidencias" },
      { optionKey: "c", correctStep: 3, text: "Escuchar al apoderado" },
      { optionKey: "d", correctStep: 4, text: "Presentar evidencias" },
    ]);
  });

  it("sin orden mostrado valido no inventa posiciones", () => {
    for (const displayed of [null, ["a", "b"], ["a", "a", "b", "c"], ["a", "b", "c", "x"]]) {
      const analysis = analyzeMiniCaseOrder(options, [], ["a", "b", "c", "d"], displayed);

      expect(analysis.placements.every((p) => p.displayedAt === null)).toBe(true);
    }
  });

  it("con secuencia alternativa, 'esperado' se mide contra la que se uso", () => {
    const analysis = analyzeMiniCaseOrder(options, ALT, ["c", "a", "b", "d"], null);

    expect(analysis).toMatchObject({
      correctSteps: 4,
      isFullyCorrect: true,
      matchedSequence: 1,
      kendallDistance: 0,
      positionCorrect: [true, true, true, true],
      validOrders: [["a", "b", "c", "d"], ["c", "a", "b", "d"]],
    });
    expect(analysis.placements.map((p) => p.expectedStep)).toEqual([1, 2, 3, 4]);
  });

  it("un caso sin alternativas no lista secuencias validas", () => {
    expect(analyzeMiniCaseOrder(options, [], ["a", "b", "c", "d"], null)).not.toHaveProperty(
      "validOrders",
    );
  });
});
