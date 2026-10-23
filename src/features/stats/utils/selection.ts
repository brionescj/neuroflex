import type {
  AgeInput,
  Catalog,
  CatalogChart,
  ChartId,
  DateRangeInput,
  DimensionId,
  Filters,
  GroupBy,
  Selection,
  StatGame,
} from "../types";

export const EMPTY_AGE: AgeInput = { min: "", max: "" };

export const EMPTY_RANGE: DateRangeInput = { from: "", to: "" };

/** Los mismos limites de fecha que exige el servidor. */
export const MIN_RANGE_DATE = "2020-01-01";
export const MAX_RANGE_DATE = "2100-12-31";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «2026-10-01» -> «1 oct 2026». */
export function formatDay(key: string): string {
  const [year, month, day] = key.split("-").map(Number) as [number, number, number];

  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** «1 oct 2026 – 31 oct 2026», o un solo dia. */
export function formatRange(range: DateRangeInput): string {
  return range.from === range.to ? formatDay(range.from) : `${formatDay(range.from)} – ${formatDay(range.to)}`;
}

/** Por que un rango escrito no sirve; null si esta completo y bien. */
export function rangeProblem(range: DateRangeInput): string | null {
  if (range.from === "" || range.to === "") return "Elige la fecha «desde» y la fecha «hasta».";
  if (range.from < MIN_RANGE_DATE || range.to > MAX_RANGE_DATE || range.from > MAX_RANGE_DATE || range.to < MIN_RANGE_DATE) {
    return `Las fechas deben estar entre ${formatDay(MIN_RANGE_DATE)} y ${formatDay(MAX_RANGE_DATE)}.`;
  }
  if (range.from > range.to) return "«Desde» no puede ser posterior a «hasta».";

  return null;
}

export type PartidaParse = { ok: true; value: number | null } | { ok: false; message: string };

/** Lo escrito en «Partida»: vacio = todas; un numero entero de 1 hasta el maximo. */
export function parsePartida(text: string, max: number): PartidaParse {
  const trimmed = text.trim();

  if (trimmed === "") return { ok: true, value: null };

  const value = /^\d{1,3}$/.test(trimmed) ? Number(trimmed) : NaN;

  if (!Number.isInteger(value) || value < 1 || value > max) {
    return { ok: false, message: `La partida debe ser un número entero de 1 a ${max}.` };
  }

  return { ok: true, value };
}

/** Cuantos grupos caben con color en un grafico; el resto se junta en «Otros» (igual que en el servidor). */
export const MAX_COLORED_GROUPS = 7;

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
    partida: "",
    countBy: "students",
    period: "all",
    periodChosen: false,
    range: EMPTY_RANGE,
    ranges: [],
    filters: {},
    age: EMPTY_AGE,
    options: defaultOptions(first),
  };
}

/** La caracteristica por la que se compara, o null si se compara otra cosa (estudiantes, fechas) o nada. */
export function comparedDimension(groupBy: GroupBy): DimensionId | null {
  return groupBy === "none" || groupBy === "student" || groupBy === "dateRange" ? null : groupBy;
}

/** Cambia de grafico conservando lo que sigue valiendo (filtros, comparacion). */
export function selectChart(
  catalog: Catalog,
  selection: Selection,
  chart: ChartId,
): Selection {
  const def = findChartDef(catalog, chart);

  if (!def) return selection;

  return fitSelection({ ...selection, chart, options: defaultOptions(def) }, def);
}

/**
 * Ajusta la seleccion a lo que el grafico permite: sin dispositivo si no lo
 * distingue, y sin comparar si es una lista.
 */
export function fitSelection(selection: Selection, chart: CatalogChart): Selection {
  const { device: _device, ...withoutDevice } = selection.filters;
  const filters = chart.supportsDevice ? selection.filters : withoutDevice;
  let groupBy = selection.groupBy;

  if (
    !chart.canCompare ||
    (groupBy === "device" && !chart.supportsDevice) ||
    (groupBy === "dateRange" && !chart.usesPeriod)
  ) {
    groupBy = "none";
  }

  return { ...selection, filters, groupBy };
}

/** Cambia de juego: parte del primer grafico; filtros y comparacion se conservan. */
export function selectGame(
  catalog: Catalog,
  selection: Selection,
  game: StatGame,
): Selection {
  const fresh = initialSelection(catalog, game);
  const first = findChartDef(catalog, fresh.chart) as CatalogChart;

  return fitSelection(
    {
      ...fresh,
      groupBy: selection.groupBy,
      students: selection.students,
      partida: selection.partida,
      countBy: selection.countBy,
      period: selection.period,
      periodChosen: selection.periodChosen,
      range: selection.range,
      ranges: selection.ranges,
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
  const groupBy = fitSelection(selection, chart).groupBy;
  const params: Record<string, string> = { chart: chart.id, groupBy };
  const partida = selection.partida.trim();

  if (chart.usesPartida) {
    if (partida !== "") params.partida = partida;
    // Solo viaja lo que cambia el resultado: contar partidas importa sin numero de partida.
    if (partida === "" && selection.countBy === "attempts") params.countBy = "attempts";
  }

  if (chart.usesPeriod) {
    if (groupBy === "dateRange") {
      // Al comparar por fechas cada grupo trae su rango: no hay un periodo aparte.
      params.ranges = JSON.stringify(selection.ranges.map(({ from, to }) => ({ from, to })));
    } else if (selection.period === "range") {
      params.range = JSON.stringify({ from: selection.range.from, to: selection.range.to });
    } else if (selection.period !== "all") {
      params.period = selection.period;
    }
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
  if (groupBy === "dateRange") return "Comparar por rango de fechas";

  return `Comparar por ${(catalog.dimensions.find((d) => d.id === groupBy)?.label ?? groupBy).toLowerCase()}`;
}

/** Los valores que se comparan: los marcados o, sin marcar nada, todos. */
export function comparedValues(filters: Filters, dimension: DimensionId, all: string[]): string[] {
  const chosen = filters[dimension];

  return chosen && chosen.length > 0 ? all.filter((value) => chosen.includes(value)) : all;
}

/**
 * Marca o desmarca un valor de los que se comparan. Siempre queda al menos
 * uno, y con todos marcados el filtro se quita (entran tambien los que no
 * tienen ese dato y los valores que aparezcan despues).
 */
export function toggleComparedValue(
  filters: Filters,
  dimension: DimensionId,
  all: string[],
  value: string,
): Filters {
  const current = comparedValues(filters, dimension, all);
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : all.filter((v) => v === value || current.includes(v));

  if (next.length === 0) return filters;

  return cleanFilters({ ...filters, [dimension]: next.length === all.length ? [] : next });
}

/** Lo que muestra la seccion «Cómo verlo» cerrada: como se ve y, al comparar, cuantos grupos. */
export function compareSummary(catalog: Catalog, selection: Selection): string {
  const base = groupByLabel(catalog, selection.groupBy);

  if (selection.groupBy === "dateRange") return `${base} (${selection.ranges.length} rangos)`;
  if (selection.groupBy === "none" || selection.groupBy === "student") return base;

  const spec = catalog.filters.find((item) => item.id === selection.groupBy);

  if (!spec) return base;

  const all = spec.options.map((option) => option.value);
  const chosen = comparedValues(selection.filters, selection.groupBy, all);

  return chosen.length < all.length ? `${base} (${chosen.length} de ${all.length})` : base;
}

/**
 * Resumen de los filtros. `skip` es la caracteristica que se esta comparando:
 * sus valores se eligen en «Cómo verlo», no aqui.
 */
export function filtersSummary(
  catalog: Catalog,
  filters: Filters,
  age: AgeInput = EMPTY_AGE,
  skip: DimensionId | null = null,
): string {
  const parts: string[] = [];

  for (const spec of catalog.filters) {
    if (spec.id === skip) continue;

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

/**
 * Lo que impide mostrar el grafico por la partida o las fechas; null si todo
 * esta en orden. Con un numero de partida hay que elegir el periodo (aunque sea
 * «Todo el tiempo») o un rango de fechas: sin eso se mezclarian partidas de
 * momentos muy distintos sin que el admin lo haya decidido.
 */
export function timeProblem(selection: Selection, chart: CatalogChart, maxPartida: number): string | null {
  const groupBy = fitSelection(selection, chart).groupBy;

  if (chart.usesPartida) {
    const partida = parsePartida(selection.partida, maxPartida);

    if (!partida.ok) return partida.message;

    if (partida.value !== null && groupBy !== "dateRange" && !selection.periodChosen) {
      return `Elige un período, o un rango de fechas, para ver la partida ${partida.value}.`;
    }
  }

  if (!chart.usesPeriod) return null;

  if (groupBy === "dateRange") {
    if (selection.ranges.length < 2) return "Para comparar por fechas hacen falta al menos 2 rangos.";

    for (const [index, range] of selection.ranges.entries()) {
      const problem = rangeProblem(range);

      if (problem) return `Rango ${index + 1}: ${problem}`;
    }

    return null;
  }

  if (selection.period === "range") return rangeProblem(selection.range);

  return null;
}

/** El periodo elegido, escrito para el subtitulo del grafico; null si no se acota. */
export function periodText(catalog: Catalog, selection: Selection): string | null {
  if (selection.period === "range") {
    return rangeProblem(selection.range) ? null : formatRange(selection.range);
  }

  if (selection.period === "all") return null;

  return catalog.periods.find((period) => period.value === selection.period)?.label ?? null;
}
