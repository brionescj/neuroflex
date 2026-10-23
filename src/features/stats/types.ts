/**
 * Tipos de las estadisticas del admin. Son la copia en el navegador de
 * lib/stats/types.ts (el servidor no comparte codigo con el navegador): si una
 * cambia, hay que cambiar la otra.
 */

export type GameId = "color-sequence" | "mini-cases" | "node-connection";

export type StatGame = GameId | "general";

export type DimensionId =
  | "paralelo"
  | "university"
  | "gender"
  | "ageBand"
  | "region"
  | "ciudad"
  | "studyShift"
  | "entryYear"
  | "device";

export type ChartId =
  | "participation"
  | "activity"
  | "abandonment"
  | "gen-summary"
  | "gen-partidas"
  | "gen-outcomes"
  | "gen-when"
  | "gen-no-play"
  | "cs-max-level"
  | "cs-pass-rate"
  | "cs-time"
  | "cs-reach"
  | "cs-bands"
  | "cs-improvement"
  | "cs-tries"
  | "cs-error-type"
  | "cs-first-error"
  | "cs-pace"
  | "nc-levels"
  | "nc-time"
  | "mc-steps"
  | "mc-time";

/** Como comparar: sin agrupar, por una caracteristica o por estudiantes elegidos. */
export type GroupBy = "none" | "student" | DimensionId;

/** Formas de ver un grafico; la tabla siempre esta aparte. */
export type ViewId = "bars" | "lines" | "pie" | "stacked" | "cards";

export type Partida = "first" | "last" | "all";

/** Que se cuenta al mirar todas las partidas: estudiantes o partidas. */
export type CountBy = "students" | "attempts";

export type PeriodId = "all" | "3d" | "7d" | "30d" | "week" | "month";

export type Filters = Partial<Record<DimensionId, string[]>>;

export type OptionChoice = { value: string; label: string };

/** Un filtro por caracteristica, con las opciones que existen. */
export type FilterSpec = {
  id: DimensionId;
  label: string;
  options: OptionChoice[];
};

export type ChartOptionDef = {
  id: string;
  label: string;
  choices: OptionChoice[];
  default: string;
};

export type CatalogChart = {
  id: ChartId;
  title: string;
  blurb: string;
  exploratory: boolean;
  canCompare: boolean;
  usesPartida: boolean;
  /** Si acepta el periodo (con o sin elegir partida). */
  usesPeriod: boolean;
  /** Si se puede separar y filtrar por dispositivo. */
  supportsDevice: boolean;
  options: ChartOptionDef[];
};

export type Catalog = {
  games: { id: StatGame; label: string; charts: CatalogChart[] }[];
  dimensions: { id: DimensionId; label: string }[];
  filters: FilterSpec[];
  ageLimits: { min: number; max: number };
  partidas: OptionChoice[];
  countBy: OptionChoice[];
  periods: { value: PeriodId; label: string }[];
  students: { rut: string; name: string; paralelo: number | null }[];
  maxComparedStudents: number;
};

export type ChartUnit = "students" | "percent" | "seconds" | "steps" | "level";

export type ChartSeries = {
  key: string;
  label: string;
  /** 0 a 7: puesto en la paleta; -1 es "Otros" y -2 es "Sin dato". */
  slot: number;
  n: number;
  values: (number | null)[];
  ns: number[];
};

/** Tabla propia de un grafico que no cabe en categorias por series (listas, resumenes). */
export type ChartTable = {
  columns: string[];
  rows: (string | number | null)[][];
};

/** Tarjetas de un resumen: un bloque por grupo comparado. */
export type ChartCards = {
  group: string;
  slot: number;
  items: { label: string; value: string; hint?: string }[];
}[];

export type ChartResult = {
  chart: ChartId;
  title: string;
  /** Formas de ver el grafico; la primera es la de partida. Vacio: solo tabla. */
  views: ViewId[];
  exploratory: boolean;
  table?: ChartTable;
  cards?: ChartCards;
  xLabel: string;
  yLabel: string;
  unit: ChartUnit;
  unitLabel: string;
  categories: string[];
  series: ChartSeries[];
  warnings: string[];
  notes: string[];
  studentsTotal: number;
  generatedAt: string;
};

/** Lo escrito en los dos campos de edad; vacio = sin limite por ese lado. */
export type AgeInput = { min: string; max: string };

/** Todo lo que el admin elige en la pantalla. */
export type Selection = {
  game: StatGame;
  chart: ChartId;
  groupBy: GroupBy;
  students: string[];
  partida: Partida;
  /** Con todas las partidas: contar estudiantes (lo normal) o partidas. */
  countBy: CountBy;
  period: PeriodId;
  filters: Filters;
  age: AgeInput;
  options: Record<string, string>;
};
