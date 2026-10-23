import type {
  AgeInput,
  Catalog,
  CatalogChart,
  ChartId,
  DimensionId,
  Filters,
  GroupBy,
  Selection,
  StatGame,
} from "../types";

export const EMPTY_AGE: AgeInput = { min: "", max: "" };

export function chartsOf(catalog: Catalog, game: StatGame): CatalogChart[] {
  return catalog.games.find((g) => g.id === game)?.charts ?? [];
}

export function findChartDef(
  catalog: Catalog,
  chart: ChartId,
): CatalogChart | undefined {
  for (const game of catalog.games) {
    const found = game.charts.find((c) => c.id === chart);

    if (found) return found;
  }

  return undefined;
}

export function defaultOptions(chart: CatalogChart): Record<string, string> {
  return Object.fromEntries(chart.options.map((o) => [o.id, o.default]));
}

/** Seleccion al abrir una pantalla o cambiar de juego: el primer grafico, sin filtros. */
export function initialSelection(catalog: Catalog, game: StatGame = "general"): Selection {
  const first = chartsOf(catalog, game)[0];

  if (!first) throw new Error(`El juego ${game} no tiene graficos.`);

  return {
    game,
    chart: first.id,
    groupBy: "none",
    students: [],
    partida: "first",
    countBy: "students",
    period: "all",
    filters: {},
    age: EMPTY_AGE,
    options: defaultOptions(first),
  };
}

/** Cambia de grafico conservando lo que sigue valiendo (filtros, comparacion). */
export function selectChart(
  catalog: Catalog,
  selection: Selection,
  chart: ChartId,
): Selection {
  const def = findChartDef(catalog, chart);

  if (!def) return selection;

  return withDeviceSupport({ ...selection, chart, options: defaultOptions(def) }, def);
}

/** Si el grafico no distingue dispositivos, se quita ese filtro y esa forma de comparar. */
export function withDeviceSupport(selection: Selection, chart: CatalogChart): Selection {
  if (chart.supportsDevice) return selection;

  const { device: _device, ...filters } = selection.filters;

  return {
    ...selection,
    filters,
    groupBy: selection.groupBy === "device" ? "none" : selection.groupBy,
  };
}

/** Cambia de juego: parte del primer grafico; filtros y comparacion se conservan. */
export function selectGame(
  catalog: Catalog,
  selection: Selection,
  game: StatGame,
): Selection {
  const fresh = initialSelection(catalog, game);
  const first = findChartDef(catalog, fresh.chart) as CatalogChart;

  return withDeviceSupport(
    {
      ...fresh,
      groupBy: selection.groupBy,
      students: selection.students,
      partida: selection.partida,
      countBy: selection.countBy,
      period: selection.period,
      filters: selection.filters,
      age: selection.age,
    },
    first,
  );
}

/** Quita los filtros vacios. */
export function cleanFilters(filters: Filters): Filters {
  const clean: Filters = {};

  for (const [key, values] of Object.entries(filters)) {
    if (values && values.length > 0) clean[key as DimensionId] = values;
  }

  return clean;
}

export function activeFilterCount(filters: Filters): number {
  return Object.values(filters).reduce(
    (sum, values) => sum + (values?.length ?? 0),
    0,
  );
}

export type AgeParse =
  | { ok: true; range: { min: number | null; max: number | null } | null }
  | { ok: false; message: string };

/**
 * Lee los dos campos de edad. Vacios = sin filtro; un solo extremo deja el otro
 * abierto. Los mismos limites los vuelve a exigir el servidor.
 */
export function parseAge(age: AgeInput, limits: { min: number; max: number }): AgeParse {
  const read = (text: string): number | null | "bad" => {
    const trimmed = text.trim();

    if (trimmed === "") return null;
    if (!/^\d{1,3}$/.test(trimmed)) return "bad";

    const value = Number(trimmed);

    return value >= limits.min && value <= limits.max ? value : "bad";
  };

  const min = read(age.min);
  const max = read(age.max);

  if (min === "bad" || max === "bad") {
    return { ok: false, message: `La edad debe estar entre ${limits.min} y ${limits.max} años.` };
  }

  if (min !== null && max !== null && min > max) {
    return { ok: false, message: "«Desde» no puede ser mayor que «hasta»." };
  }

  return { ok: true, range: min === null && max === null ? null : { min, max } };
}

export function ageSummary(age: AgeInput, limits: { min: number; max: number }): string | null {
  const parsed = parseAge(age, limits);

  if (!parsed.ok || !parsed.range) return null;

  const { min, max } = parsed.range;

  if (min !== null && max !== null) return min === max ? `Edad: ${min}` : `Edad: ${min} a ${max}`;

  return min !== null ? `Edad: desde ${min}` : `Edad: hasta ${max}`;
}

/**
 * Parametros de la peticion. Solo viajan los que el grafico usa: asi dos
 * selecciones que dan el mismo grafico tienen la misma clave.
 */
export function buildChartParams(
  selection: Selection,
  chart: CatalogChart,
  limits: { min: number; max: number },
): Record<string, string> {
  const params: Record<string, string> = {
    chart: chart.id,
    groupBy: selection.groupBy === "device" && !chart.supportsDevice ? "none" : selection.groupBy,
  };

  if (chart.usesPartida) {
    params.partida = selection.partida;
    // Solo viaja lo que cambia el resultado: contar partidas importa con "todas".
    if (selection.partida === "all" && selection.countBy === "attempts") params.countBy = "attempts";
    if (selection.period !== "all") params.period = selection.period;
  }

  const { device: _device, ...withoutDevice } = selection.filters;
  const filters = cleanFilters(chart.supportsDevice ? selection.filters : withoutDevice);

  if (Object.keys(filters).length > 0) params.filters = JSON.stringify(filters);

  // Una edad invalida no viaja: la pantalla no deja pedir el grafico en ese caso.
  const age = parseAge(selection.age, limits);

  if (age.ok && age.range) params.age = JSON.stringify(age.range);

  if (selection.groupBy === "student") {
    params.students = JSON.stringify(selection.students);
  }

  if (chart.options.length > 0) {
    params.options = JSON.stringify(
      Object.fromEntries(
        chart.options.map((o) => [o.id, selection.options[o.id] ?? o.default]),
      ),
    );
  }

  return params;
}

export function paramsKey(params: Record<string, string>): string {
  return JSON.stringify(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)));
}

export function groupByLabel(catalog: Catalog, groupBy: GroupBy): string {
  if (groupBy === "none") return "Ver el gráfico completo";
  if (groupBy === "student") return "Comparar estudiantes";

  return `Comparar por ${(catalog.dimensions.find((d) => d.id === groupBy)?.label ?? groupBy).toLowerCase()}`;
}

export function filtersSummary(
  catalog: Catalog,
  filters: Filters,
  age: AgeInput = EMPTY_AGE,
): string {
  const parts: string[] = [];

  for (const spec of catalog.filters) {
    const values = filters[spec.id];

    if (!values || values.length === 0) continue;

    const labels = values.map(
      (value) => spec.options.find((o) => o.value === value)?.label ?? value,
    );

    parts.push(`${spec.label}: ${labels.join(", ")}`);
  }

  const ageText = ageSummary(age, catalog.ageLimits);

  if (ageText) parts.push(ageText);

  return parts.length === 0 ? "Sin filtros" : parts.join(" · ");
}

/** Quita o agrega un valor de un filtro. */
export function toggleFilterValue(
  filters: Filters,
  dimension: DimensionId,
  value: string,
): Filters {
  const current = filters[dimension] ?? [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];

  return cleanFilters({ ...filters, [dimension]: next });
}

/** Sin tildes ni mayusculas, para buscar estudiantes por nombre. */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
