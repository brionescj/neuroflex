import { describe, expect, it } from "vitest";

import { activeChips } from "./activeChips";
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

describe("chip de lo que se compara", () => {
  it("sin comparar no hay chips, aunque haya filtros guardados de antes", () => {
    expect(chipsOf(base)).toEqual([]);
    expect(chipsOf({ ...base, filters: { paralelo: ["1"] }, age: { min: "20", max: "25" } })).toEqual([]);
  });

  it("la comparación es un único chip que dice por qué se compara", () => {
    const chips = chipsOf({ ...base, groupBy: "gender", filters: { gender: ["female"], paralelo: ["1"] } });

    expect(chips.map((chip) => chip.label)).toEqual(["Por género"]);
  });

  it("quitar el chip olvida también los valores comparados", () => {
    const selection: Selection = { ...base, groupBy: "gender", alsoBy: ["paralelo"], filters: { paralelo: ["1"], gender: ["female"] } };
    const cleared = chipsOf(selection)[0]!.clear(selection);

    expect(cleared.groupBy).toBe("none");
    expect(cleared.alsoBy).toEqual([]);
    expect(cleared.filters).toEqual({});
  });

  it("en un gráfico que no se compara no aparece ningún chip", () => {
    const list = { ...chart, canCompare: false };

    expect(activeChips(catalog, { ...base, groupBy: "gender" }, list)).toEqual([]);
  });
});
