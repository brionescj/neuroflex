import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  buildChartParams,
  cleanFilters,
  compareSummary,
  comparedValues,
  filtersSummary,
  groupByLabel,
  initialSelection,
  ageSummary,
  formatRange,
  parsePartida,
  rangeProblem,
  canChooseCount,
  partidaText,
  timeProblem,
  normalizeSearch,
  parseAge,
  paramsKey,
  selectChart,
  selectGame,
  toggleComparedValue,
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
  maxComparedStudents: 6,
};

describe("seleccion inicial y cambios", () => {
  it("parte del primer grafico del juego con las opciones por defecto", () => {
    expect(initialSelection(catalog)).toMatchObject({
      game: "general",
      chart: "participation",
      groupBy: "none",
      partida: "",
      countBy: "students",
      period: "all",
      periodChosen: false,
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
      partida: "12",
      period: "7d" as const,
      filters: { paralelo: ["1"], gender: [] },
    };

    expect(buildChartParams(selection, seriation[0]!, LIMITS)).toEqual({
      chart: "cs-max-level",
      groupBy: "student",
      partida: "12",
      period: "7d",
      filters: '{"paralelo":["1"]}',
      students: '["11111111-1"]',
    });
  });

  it("«Contar partidas» viaja salvo con una sola partida por estudiante", () => {
    const base = { ...initialSelection(catalog, "color-sequence"), countBy: "attempts" as const };
    const chart = seriation[0]!;

    expect(buildChartParams({ ...base, partida: "1" }, chart, LIMITS).countBy).toBeUndefined();
    expect(buildChartParams({ ...base, partida: "3" }, chart, LIMITS).countBy).toBe("attempts");
    expect(buildChartParams({ ...base, partida: "" }, chart, LIMITS).countBy).toBe("attempts");
    expect(buildChartParams({ ...base, partida: "", countBy: "students" }, chart, LIMITS).countBy).toBeUndefined();
  });

  it("«take» viaja solo con una cantidad de partidas y solo si son las últimas", () => {
    const chart = seriation[0]!;
    const base = initialSelection(catalog, "color-sequence");

    expect(buildChartParams({ ...base, partida: "4" }, chart, LIMITS).take).toBeUndefined();
    expect(buildChartParams({ ...base, partida: "4", take: "last" }, chart, LIMITS).take).toBe("last");
    expect(buildChartParams({ ...base, partida: "", take: "last" }, chart, LIMITS).take).toBeUndefined();
  });

  it("el subtítulo dice cuántas partidas y cuáles", () => {
    const base = initialSelection(catalog, "color-sequence");

    expect(partidaText(base)).toBe("Todas las partidas");
    expect(partidaText({ ...base, partida: "1" })).toBe("Primera partida");
    expect(partidaText({ ...base, partida: "1", take: "last" })).toBe("Última partida");
    expect(partidaText({ ...base, partida: "4" })).toBe("Primeras 4 partidas");
    expect(partidaText({ ...base, partida: "4", take: "last" })).toBe("Últimas 4 partidas");
    expect(canChooseCount({ ...base, partida: "1" })).toBe(false);
    expect(canChooseCount({ ...base, partida: "4" })).toBe(true);
    expect(canChooseCount(base)).toBe(true);
  });

  it("sin número de partida no viaja «partida»; con número viaja tal cual", () => {
    const chart = seriation[0]!;
    const base = initialSelection(catalog, "color-sequence");

    expect(buildChartParams(base, chart, LIMITS).partida).toBeUndefined();
    expect(buildChartParams({ ...base, partida: " 12 " }, chart, LIMITS).partida).toBe("12");
  });

  it("un rango de fechas viaja como «range» y reemplaza al período", () => {
    const base = {
      ...initialSelection(catalog, "color-sequence"),
      period: "range" as const,
      range: { from: "2026-10-01", to: "2026-10-31" },
    };
    const params = buildChartParams(base, seriation[0]!, LIMITS);

    expect(params.range).toBe('{"from":"2026-10-01","to":"2026-10-31"}');
    expect(params.period).toBeUndefined();
  });

  it("al comparar por fechas viajan los rangos y ni el período ni el rango suelto", () => {
    const base = {
      ...initialSelection(catalog, "color-sequence"),
      groupBy: "dateRange" as const,
      period: "7d" as const,
      range: { from: "2026-10-01", to: "2026-10-31" },
      ranges: [
        { from: "2027-06-24", to: "2027-07-24" },
        { from: "2026-10-01", to: "2026-10-31" },
      ],
    };
    const params = buildChartParams(base, seriation[0]!, LIMITS);

    expect(params.groupBy).toBe("dateRange");
    expect(params.ranges).toBe('[{"from":"2027-06-24","to":"2027-07-24"},{"from":"2026-10-01","to":"2026-10-31"}]');
    expect(params.period).toBeUndefined();
    expect(params.range).toBeUndefined();
  });

  it("comparar por fechas se descarta en un gráfico que no mira fechas", () => {
    const base = { ...initialSelection(catalog, "general"), groupBy: "dateRange" as const };

    expect(buildChartParams(base, catalog.games[0]!.charts[0]!, LIMITS).groupBy).toBe("none");
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

describe("elegir que se compara", () => {
  const all = ["1", "2", "3"];

  it("sin filtro se comparan todos", () => {
    expect(comparedValues({}, "paralelo", all)).toEqual(["1", "2", "3"]);
    expect(comparedValues({ paralelo: [] }, "paralelo", all)).toEqual(["1", "2", "3"]);
  });

  it("desmarcar uno deja los demas; con todos marcados el filtro se quita", () => {
    const without2 = toggleComparedValue({}, "paralelo", all, "2");

    expect(without2).toEqual({ paralelo: ["1", "3"] });
    expect(comparedValues(without2, "paralelo", all)).toEqual(["1", "3"]);
    // Volver a marcarlo: quedan todos, asi que ya no hay filtro.
    expect(toggleComparedValue(without2, "paralelo", all, "2")).toEqual({});
  });

  it("conserva el orden natural al volver a marcar", () => {
    const only3 = { paralelo: ["3"] };
    const back1 = toggleComparedValue(only3, "paralelo", all, "1");

    expect(back1).toEqual({ paralelo: ["1", "3"] });
  });

  it("siempre queda al menos uno marcado", () => {
    const only1 = { paralelo: ["1"] };

    expect(toggleComparedValue(only1, "paralelo", all, "1")).toBe(only1);
  });

  it("no toca los filtros de otras caracteristicas", () => {
    expect(toggleComparedValue({ gender: ["female"] }, "paralelo", all, "1")).toEqual({
      gender: ["female"],
      paralelo: ["2", "3"],
    });
  });

  it("el resumen de «Cómo verlo» dice cuantos grupos se comparan", () => {
    const base = { ...initialSelection(catalog), groupBy: "paralelo" as const };

    expect(compareSummary(catalog, base)).toBe("Comparar por paralelo");
    expect(compareSummary(catalog, { ...base, filters: { paralelo: ["1"] } })).toBe(
      "Comparar por paralelo (1 de 2)",
    );
    expect(compareSummary(catalog, { ...base, groupBy: "none" })).toBe("Ver el gráfico completo");
  });

  it("el resumen de filtros omite la caracteristica que se compara", () => {
    const filters = { paralelo: ["1"], gender: ["female"] };

    expect(filtersSummary(catalog, filters, undefined, "paralelo")).toBe("Género: Femenino");
    expect(filtersSummary(catalog, { paralelo: ["1"] }, undefined, "paralelo")).toBe("Sin filtros");
  });
});

describe("partida y fechas", () => {
  it("parsePartida: vacío es todas; un número de 1 al máximo; lo demás no", () => {
    expect(parsePartida("", 500)).toEqual({ ok: true, value: null });
    expect(parsePartida("  ", 500)).toEqual({ ok: true, value: null });
    expect(parsePartida("12", 500)).toEqual({ ok: true, value: 12 });
    expect(parsePartida("500", 500)).toEqual({ ok: true, value: 500 });

    for (const bad of ["0", "501", "-1", "1.5", "abc", "1e2"]) {
      expect(parsePartida(bad, 500).ok).toBe(false);
    }
  });

  it("rangeProblem pide las dos fechas, en orden y dentro de los años aceptados", () => {
    expect(rangeProblem({ from: "2026-10-01", to: "2026-10-31" })).toBeNull();
    expect(rangeProblem({ from: "2026-10-05", to: "2026-10-05" })).toBeNull();
    expect(rangeProblem({ from: "", to: "2026-10-31" })).toMatch(/desde/);
    expect(rangeProblem({ from: "2026-10-01", to: "" })).toMatch(/hasta/);
    expect(rangeProblem({ from: "2026-10-31", to: "2026-10-01" })).toMatch(/posterior/);
    expect(rangeProblem({ from: "2019-01-01", to: "2026-10-01" })).toMatch(/entre/);
  });

  it("formatRange", () => {
    expect(formatRange({ from: "2027-06-24", to: "2027-07-24" })).toBe("24 jun 2027 – 24 jul 2027");
    expect(formatRange({ from: "2026-10-05", to: "2026-10-05" })).toBe("5 oct 2026");
  });

  const chart = catalog.games[1]!.charts[0]!;
  const fresh = () => initialSelection(catalog, "color-sequence");

  it("sin partida ni rango no hay nada que bloquear", () => {
    expect(timeProblem(fresh(), chart, 500)).toBeNull();
  });

  it("con un número de partida hay que elegir el período, aunque sea «Todo el tiempo»", () => {
    const selection = { ...fresh(), partida: "12" };

    expect(timeProblem(selection, chart, 500)).toMatch(/Elige un período.*las 12 partidas/);
    expect(timeProblem({ ...selection, periodChosen: true }, chart, 500)).toBeNull();
    expect(timeProblem({ ...selection, periodChosen: true, period: "7d" }, chart, 500)).toBeNull();
  });

  it("con un número de partida, un rango incompleto sigue bloqueando", () => {
    const selection = { ...fresh(), partida: "12", periodChosen: true, period: "range" as const };

    expect(timeProblem(selection, chart, 500)).toMatch(/desde/);
    expect(
      timeProblem({ ...selection, range: { from: "2026-10-01", to: "2026-10-31" } }, chart, 500),
    ).toBeNull();
  });

  it("una partida mal escrita bloquea", () => {
    expect(timeProblem({ ...fresh(), partida: "0" }, chart, 500)).toMatch(/entero/);
  });

  it("al comparar por fechas los rangos reemplazan la elección del período", () => {
    const two = [
      { from: "2027-06-24", to: "2027-07-24" },
      { from: "2026-10-01", to: "2026-10-31" },
    ];
    const selection = { ...fresh(), partida: "12", groupBy: "dateRange" as const, ranges: two };

    expect(timeProblem(selection, chart, 500)).toBeNull();
    expect(timeProblem({ ...selection, ranges: [two[0]!] }, chart, 500)).toMatch(/al menos 2/);
    expect(timeProblem({ ...selection, ranges: [two[0]!, { from: "", to: "" }] }, chart, 500)).toMatch(/Rango 2/);
    expect(timeProblem({ ...selection, ranges: [two[0]!, { from: "2026-11-01", to: "2026-10-01" }] }, chart, 500)).toMatch(
      /Rango 2.*posterior/,
    );
  });
});
