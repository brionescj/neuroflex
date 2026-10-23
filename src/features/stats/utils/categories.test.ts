import { describe, expect, it } from "vitest";

import type { ChartResult } from "../types";
import {
  canHideCategories,
  categoriesSignature,
  hiddenCategoriesNote,
  toggleCategory,
  withoutCategories,
} from "./categories";

function result(extra: Partial<ChartResult> = {}): ChartResult {
  return {
    chart: "cs-max-level",
    title: "Nivel máximo",
    views: ["bars"],
    exploratory: false,
    xLabel: "Nivel",
    yLabel: "Estudiantes",
    unit: "students",
    unitLabel: "estudiantes",
    categories: ["1", "2", "3", "4"],
    series: [
      { key: "a", label: "A", slot: 0, n: 10, values: [1, 2, 3, 4], ns: [10, 20, 30, 40] },
      { key: "b", label: "B", slot: 1, n: 5, values: [5, 6, 7, 8], ns: [50, 60, 70, 80] },
    ],
    warnings: [],
    notes: [],
    studentsTotal: 15,
    generatedAt: "2026-10-21T15:00:00Z",
    ...extra,
  };
}

describe("withoutCategories", () => {
  it("sin nada oculto devuelve el mismo resultado", () => {
    const full = result();

    expect(withoutCategories(full, new Set())).toBe(full);
  });

  it("quita la categoría de todas las series, con sus totales, y conserva los demás valores", () => {
    const out = withoutCategories(result(), new Set([1, 2]));

    expect(out.categories).toEqual(["1", "4"]);
    expect(out.series[0]?.values).toEqual([1, 4]);
    expect(out.series[0]?.ns).toEqual([10, 40]);
    expect(out.series[1]?.values).toEqual([5, 8]);
    // El total de estudiantes de cada grupo no cambia: sigue siendo de todo el grupo.
    expect(out.series.map((s) => s.n)).toEqual([10, 5]);
    expect(out.studentsTotal).toBe(15);
  });

  it("las categorías que quedan conservan su puesto (su color) original", () => {
    const out = withoutCategories(result(), new Set([0]));

    expect(out.categorySlots).toEqual([1, 2, 3]);
  });

  it("no toca un resumen en tarjetas ni una lista", () => {
    const cards = result({ cards: [{ group: "A", slot: 0, items: [] }] });
    const table = result({ table: { columns: ["x"], rows: [] } });

    expect(canHideCategories(cards)).toBe(false);
    expect(canHideCategories(table)).toBe(false);
    expect(withoutCategories(cards, new Set([0]))).toBe(cards);
    expect(withoutCategories(table, new Set([0]))).toBe(table);
  });

  it("una sola categoría no se puede quitar", () => {
    expect(canHideCategories(result({ categories: ["1"] }))).toBe(false);
  });
});

describe("toggleCategory", () => {
  it("oculta y vuelve a mostrar", () => {
    const hidden = toggleCategory(new Set(), 4, 2);

    expect([...hidden]).toEqual([2]);
    expect([...toggleCategory(hidden, 4, 2)]).toEqual([]);
  });

  it("la última visible no se puede ocultar", () => {
    let hidden = new Set<number>();

    for (const index of [0, 1, 2, 3]) hidden = toggleCategory(hidden, 4, index);

    expect([...hidden]).toEqual([0, 1, 2]);
  });

  it("no cambia el conjunto original", () => {
    const original = new Set<number>([0]);

    toggleCategory(original, 4, 1);
    expect([...original]).toEqual([0]);
  });
});

describe("categoriesSignature y nota", () => {
  it("cambia con el gráfico o con las categorías", () => {
    expect(categoriesSignature(result())).not.toBe(categoriesSignature(result({ categories: ["1", "2"] })));
    expect(categoriesSignature(result())).not.toBe(categoriesSignature(result({ chart: "cs-time" })));
    expect(categoriesSignature(result())).toBe(categoriesSignature(result()));
  });

  it("la nota nombra lo que se quitó y avisa del recálculo", () => {
    const note = hiddenCategoriesNote(result(), new Set([2, 0]));

    expect(note).toMatch(/Se quitaron del gráfico: 1, 3\./);
    expect(note).toMatch(/se calculan solo con las partes que se ven/);
    expect(hiddenCategoriesNote(result(), new Set())).toBeNull();
  });
});
