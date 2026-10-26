import { describe, expect, it } from "vitest";

import { activeChips, withoutChips } from "./activeChips";
import { findChartDef, initialSelection } from "./selection";
import type { Catalog, Selection } from "../types";

const LIMITS = { min: 17, max: 80 };

const catalog: Catalog = {
  games: [
    {
      id: "general",
      label: "General",
      charts: [
        {
          id: "participation",
          title: "Participación",
          blurb: "x".repeat(50),
          exploratory: false,
          canCompare: true,
          usesPartida: false,
          usesPeriod: false,
          supportsDevice: false,
          options: [{ id: "as", label: "Mostrar como", default: "percent", choices: [{ value: "percent", label: "%" }] }],
        },
      ],
    },
    {
      id: "color-sequence",
      label: "Seriación de colores",
      charts: [
        {
          id: "cs-max-level",
          title: "Nivel máximo",
          blurb: "x".repeat(50),
          exploratory: false,
          canCompare: true,
          usesPartida: true,
          usesPeriod: true,
          supportsDevice: true,
          options: [],
        },
        {
          id: "cs-pass-rate",
          title: "Aprobación",
          blurb: "x".repeat(50),
          exploratory: false,
          canCompare: true,
          usesPartida: true,
          usesPeriod: true,
          supportsDevice: true,
          options: [{ id: "measure", label: "Contar", default: "firstTry", choices: [{ value: "firstTry", label: "1" }] }],
        },
      ],
    },
  ],
  dimensions: [
    { id: "paralelo", label: "Paralelo" },
    { id: "gender", label: "Género" },
  ],
  filters: [
    {
      id: "paralelo",
      label: "Paralelo",
      options: [{ value: "1", label: "Paralelo 1" }, { value: "2", label: "Paralelo 2" }],
    },
    { id: "gender", label: "Género", options: [{ value: "female", label: "Femenino" }] },
  ],
  ageLimits: LIMITS,
  maxPartida: 500,
  maxDateRanges: 4,
  countBy: [
    { value: "students", label: "Estudiantes" },
    { value: "attempts", label: "Contar partidas" },
  ],
  periods: [
    { value: "all", label: "Todo el tiempo" },
    { value: "7d", label: "Últimos 7 días" },
  ],
  students: [],
  studentTable: [],
  maxComparedStudents: 6,
};


const chart = findChartDef(catalog, "cs-pass-rate")!;
const base = initialSelection(catalog, "color-sequence");

function chipsOf(selection: Selection) {
  return activeChips(catalog, selection, chart);
}

describe("chips de lo que está activo", () => {
  it("sin comparar ni filtrar no hay chips", () => {
    expect(chipsOf(base)).toEqual([]);
  });

  it("la comparación es un chip y sus valores no se repiten como filtros", () => {
    const chips = chipsOf({ ...base, groupBy: "gender", filters: { gender: ["female"], paralelo: ["1"] } });

    expect(chips.map((chip) => chip.label)).toEqual(["Por género", "Paralelo: Paralelo 1"]);
  });

  it("quitar el chip de comparar olvida también los valores comparados, pero deja los filtros", () => {
    const selection: Selection = { ...base, groupBy: "gender", alsoBy: ["paralelo"], filters: { paralelo: ["1"], gender: ["female"] } };
    const cleared = chipsOf(selection)[0]!.clear(selection);

    expect(cleared.groupBy).toBe("none");
    expect(cleared.alsoBy).toEqual([]);
    expect(cleared.filters).toEqual({});
  });

  it("cada filtro y la edad son chips que se quitan por separado", () => {
    const selection: Selection = { ...base, filters: { paralelo: ["1", "2"] }, age: { min: "20", max: "25" } };
    const chips = chipsOf(selection);

    expect(chips.map((chip) => chip.label)).toEqual(["Paralelo: Paralelo 1, Paralelo 2", "Edad: 20 a 25"]);
    expect(chips[0]!.clear(selection).filters).toEqual({});
    expect(chips[1]!.clear(selection).age).toEqual({ min: "", max: "" });
  });

  it("con muchos valores el chip dice cuántos hay", () => {
    const wide: Catalog = {
      ...catalog,
      filters: [{ id: "paralelo", label: "Paralelo", options: ["1", "2", "3"].map((v) => ({ value: v, label: v })) }],
    };

    expect(activeChips(wide, { ...base, filters: { paralelo: ["1", "2", "3"] } }, chart)[0]?.label).toBe("Paralelo: 3 elegidos");
  });

  it("en un gráfico que no se compara, la comparación no aparece como chip", () => {
    const list = { ...chart, canCompare: false };

    expect(activeChips(catalog, { ...base, groupBy: "gender" }, list)).toEqual([]);
  });

  it("withoutChips deja la selección sin comparación, filtros ni edad", () => {
    const selection: Selection = { ...base, groupBy: "gender", filters: { paralelo: ["1"] }, age: { min: "20", max: "" } };

    expect(withoutChips(selection)).toMatchObject({ groupBy: "none", alsoBy: [], filters: {}, age: { min: "", max: "" } });
  });
});
