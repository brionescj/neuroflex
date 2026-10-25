import { describe, expect, it } from "vitest";

import { calcSummary } from "./calcSummary";

describe("calcSummary", () => {
  it("de un grupo dice cuantos estudiantes, en singular o plural", () => {
    expect(calcSummary({ studentsTotal: 39 }, false, false)).toBe("Cómo se calculó (39 estudiantes)");
    expect(calcSummary({ studentsTotal: 1 }, false, false)).toBe("Cómo se calculó (1 estudiante)");
  });

  it("avisa cuando se quito algo del grafico", () => {
    expect(calcSummary({ studentsTotal: 5 }, false, true)).toBe(
      "Cómo se calculó (5 estudiantes, contando lo que se quitó del gráfico)",
    );
  });

  it("de un solo estudiante nunca cuenta estudiantes", () => {
    expect(calcSummary({ studentsTotal: 1 }, true, false)).toBe("Cómo se calculó");
    expect(calcSummary({ studentsTotal: 1 }, true, true)).toBe("Cómo se calculó (contando lo que se quitó del gráfico)");
  });
});
