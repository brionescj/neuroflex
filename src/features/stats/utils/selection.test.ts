import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  buildChartParams,
  cleanFilters,
  filtersSummary,
  groupByLabel,
  initialSelection,
  ageSummary,
  normalizeSearch,
  parseAge,
  paramsKey,
  selectChart,
  selectGame,
  toggleFilterValue,
} from "./selection";
import type { Catalog } from "../types";

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
      control: "chips",
      options: [{ value: "1", label: "Paralelo 1" }, { value: "2", label: "Paralelo 2" }],
    },
    { id: "gender", label: "Género", control: "chips", options: [{ value: "female", label: "Femenino" }] },
  ],
  ageLimits: LIMITS,
  partidas: [],
  countBy: [
    { value: "students", label: "Estudiantes" },
    { value: "attempts", label: "Contar partidas" },
  ],
  periods: [
    { value: "all", label: "Todo el tiempo" },
    { value: "7d", label: "Últimos 7 días" },
  ],
  students: [],
  maxComparedStudents: 6,
  lowN: 5,
};

describe("seleccion inicial y cambios", () => {
  it("parte del primer grafico del juego con las opciones por defecto", () => {
    expect(initialSelection(catalog)).toMatchObject({
      game: "general",
      chart: "participation",
      groupBy: "none",
      partida: "first",
      countBy: "students",
      period: "all",
      filters: {},
      options: { as: "percent" },
    });
  });

  it("cambiar de grafico reinicia sus opciones pero conserva filtros y comparacion", () => {
    const base = {
      ...initialSelection(catalog, "color-sequence"),
      groupBy: "gender" as const,
      filters: { paralelo: ["1"] },
    };
    const next = selectChart(catalog, base, "cs-pass-rate");

    expect(next.chart).toBe("cs-pass-rate");
    expect(next.options).toEqual({ measure: "firstTry" });
    expect(next.groupBy).toBe("gender");
    expect(next.filters).toEqual({ paralelo: ["1"] });
  });

  it("cambiar de juego va al primer grafico y conserva filtros, comparacion y partida", () => {
    const base = {
      ...initialSelection(catalog),
      groupBy: "gender" as const,
      partida: "last" as const,
      filters: { paralelo: ["2"] },
    };
    const next = selectGame(catalog, base, "color-sequence");

    expect(next).toMatchObject({
      game: "color-sequence",
      chart: "cs-max-level",
      groupBy: "gender",
      partida: "last",
      filters: { paralelo: ["2"] },
    });
  });
});

describe("buildChartParams", () => {
  const seriation = catalog.games[1]!.charts;

  it("manda solo lo que el grafico usa", () => {
    const selection = { ...initialSelection(catalog, "general"), partida: "last" as const, period: "7d" as const };
    const general = catalog.games[0]!.charts[0]!;

    expect(buildChartParams(selection, general, LIMITS)).toEqual({
      chart: "participation",
      groupBy: "none",
      options: '{"as":"percent"}',
    });
  });

  it("incluye partida, período, filtros y estudiantes cuando corresponden", () => {
    const selection = {
      ...initialSelection(catalog, "color-sequence"),
      groupBy: "student" as const,
      students: ["11111111-1"],
      partida: "all" as const,
      period: "7d" as const,
      filters: { paralelo: ["1"], gender: [] },
    };

    expect(buildChartParams(selection, seriation[0]!, LIMITS)).toEqual({
      chart: "cs-max-level",
      groupBy: "student",
      partida: "all",
      period: "7d",
      filters: '{"paralelo":["1"]}',
      students: '["11111111-1"]',
    });
  });

  it("«Contar partidas» solo viaja con todas las partidas", () => {
    const base = { ...initialSelection(catalog, "color-sequence"), countBy: "attempts" as const };
    const chart = seriation[0]!;

    expect(buildChartParams({ ...base, partida: "first" }, chart, LIMITS).countBy).toBeUndefined();
    expect(buildChartParams({ ...base, partida: "all" }, chart, LIMITS).countBy).toBe("attempts");
    expect(buildChartParams({ ...base, partida: "all", countBy: "students" }, chart, LIMITS).countBy).toBeUndefined();
  });

  it("el dispositivo no viaja a un gráfico que no lo distingue, y se limpia al cambiar a él", () => {
    const base = {
      ...initialSelection(catalog, "color-sequence"),
      filters: { device: ["tablet"], gender: ["female"] },
    };
    const general = catalog.games[0]!.charts[0]!;

    expect(buildChartParams(base, seriation[0]!, LIMITS).filters).toBe('{"device":["tablet"],"gender":["female"]}');
    expect(buildChartParams(base, general, LIMITS).filters).toBe('{"gender":["female"]}');
    expect(buildChartParams({ ...base, groupBy: "device" }, general, LIMITS).groupBy).toBe("none");

    const moved = selectChart(catalog, { ...base, groupBy: "device" }, "participation");

    expect(moved.filters).toEqual({ gender: ["female"] });
    expect(moved.groupBy).toBe("none");

    // Lo mismo al cambiar de juego: el primer grafico de «General» no distingue dispositivos.
    const game = selectGame(catalog, { ...base, groupBy: "device" }, "general");

    expect(game.filters).toEqual({ gender: ["female"] });
    expect(game.groupBy).toBe("none");
  });

  it("el período viaja con los graficos que lo usan, aunque no elijan partida", () => {
    const base = { ...initialSelection(catalog, "color-sequence"), period: "7d" as const };
    const general = catalog.games[0]!.charts[0]!;
    const noPeriod = buildChartParams(base, general, LIMITS);
    const byPeriod = buildChartParams(base, { ...general, usesPeriod: true }, LIMITS);

    expect(noPeriod.period).toBeUndefined();
    expect(byPeriod.period).toBe("7d");
    expect(byPeriod.partida).toBeUndefined();
  });

  it("una lista no se compara: la forma de comparar vuelve a «completo»", () => {
    const list = { ...catalog.games[0]!.charts[0]!, canCompare: false };
    const base = { ...initialSelection(catalog, "general"), groupBy: "paralelo" as const };

    expect(buildChartParams(base, list, LIMITS).groupBy).toBe("none");
  });

  it("manda la edad como rango solo si es valida y hay algo escrito", () => {
    const base = initialSelection(catalog, "color-sequence");
    const chart = seriation[0]!;

    expect(buildChartParams({ ...base, age: { min: "18", max: "25" } }, chart, LIMITS).age).toBe(
      '{"min":18,"max":25}',
    );
    expect(buildChartParams({ ...base, age: { min: "", max: "22" } }, chart, LIMITS).age).toBe(
      '{"min":null,"max":22}',
    );
    expect(buildChartParams(base, chart, LIMITS).age).toBeUndefined();
    expect(buildChartParams({ ...base, age: { min: "30", max: "20" } }, chart, LIMITS).age).toBeUndefined();
  });

  it("dos selecciones equivalentes tienen la misma clave", () => {
    const a = { chart: "x", groupBy: "none" };
    const b = { groupBy: "none", chart: "x" };

    expect(paramsKey(a)).toBe(paramsKey(b));
    expect(paramsKey(a)).not.toBe(paramsKey({ chart: "y", groupBy: "none" }));
  });
});

describe("filtros", () => {
  it("agrega y quita valores, y descarta las caracteristicas vacias", () => {
    const one = toggleFilterValue({}, "paralelo", "1");
    const two = toggleFilterValue(one, "paralelo", "2");

    expect(two).toEqual({ paralelo: ["1", "2"] });
    expect(toggleFilterValue(two, "paralelo", "1")).toEqual({ paralelo: ["2"] });
    expect(toggleFilterValue(one, "paralelo", "1")).toEqual({});
    expect(cleanFilters({ paralelo: [], gender: ["male"] })).toEqual({ gender: ["male"] });
  });

  it("cuenta y resume los filtros activos", () => {
    const filters = { paralelo: ["1", "2"], gender: ["female"] };

    expect(activeFilterCount(filters)).toBe(3);
    expect(filtersSummary(catalog, filters)).toBe("Paralelo: Paralelo 1, Paralelo 2 · Género: Femenino");
    expect(filtersSummary(catalog, {})).toBe("Sin filtros");
  });
});

describe("edad", () => {
  it("vacio es sin filtro y un solo extremo deja el otro abierto", () => {
    expect(parseAge({ min: "", max: "" }, LIMITS)).toEqual({ ok: true, range: null });
    expect(parseAge({ min: " 18 ", max: "" }, LIMITS)).toEqual({ ok: true, range: { min: 18, max: null } });
    expect(parseAge({ min: "", max: "25" }, LIMITS)).toEqual({ ok: true, range: { min: null, max: 25 } });
  });

  it("rechaza lo que no es entero, esta fuera de rango o esta al reves", () => {
    for (const age of [
      { min: "16", max: "" },
      { min: "", max: "81" },
      { min: "1e1", max: "" },
      { min: "18.5", max: "" },
      { min: "30", max: "20" },
    ]) {
      expect(parseAge(age, LIMITS).ok, JSON.stringify(age)).toBe(false);
    }
  });

  it("se resume en palabras", () => {
    expect(ageSummary({ min: "18", max: "25" }, LIMITS)).toBe("Edad: 18 a 25");
    expect(ageSummary({ min: "30", max: "" }, LIMITS)).toBe("Edad: desde 30");
    expect(ageSummary({ min: "", max: "22" }, LIMITS)).toBe("Edad: hasta 22");
    expect(ageSummary({ min: "22", max: "22" }, LIMITS)).toBe("Edad: 22");
    expect(ageSummary({ min: "", max: "" }, LIMITS)).toBeNull();
    expect(filtersSummary(catalog, { gender: ["female"] }, { min: "18", max: "" })).toBe(
      "Género: Femenino · Edad: desde 18",
    );
  });
});

describe("textos", () => {
  it("describe como se compara", () => {
    expect(groupByLabel(catalog, "none")).toBe("Ver el gráfico completo");
    expect(groupByLabel(catalog, "gender")).toBe("Comparar por género");
    expect(groupByLabel(catalog, "student")).toBe("Comparar estudiantes");
  });

  it("la busqueda ignora tildes y mayusculas", () => {
    expect(normalizeSearch("  María Peña ")).toBe("maria pena");
  });
});
