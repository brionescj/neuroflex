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
  | "gen-inactive"
  | "gen-stuck"
  | "gen-failed"
  | "gen-abandoners"
  | "gen-locked"
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
  | "mc-time"
  /** Solo en la ficha de un estudiante (no estan en el catalogo). */
  | "st-time"
  | "st-restarts";

/** Como comparar: sin agrupar, por una caracteristica, por estudiantes elegidos o por rangos de fechas. */
export type GroupBy = "none" | "student" | "dateRange" | DimensionId;

/** Formas de ver un grafico; la tabla siempre esta aparte. */
export type ViewId = "bars" | "lines" | "pie" | "stacked" | "cards";

/** Un rango de fechas escrito en los campos de fecha (AAAA-MM-DD); vacio mientras no se elige. */
export type DateRangeInput = { from: string; to: string };

/** Con una cantidad de partidas: las primeras (mas antiguas) o las ultimas (mas recientes) del periodo. */
export type TakeId = "first" | "last";

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
  /** La partida mas alta que se puede pedir. */
  maxPartida: number;
  /** Cuantos rangos de fechas se pueden comparar a la vez. */
  maxDateRanges: number;
  countBy: OptionChoice[];
  periods: { value: PeriodId; label: string }[];
  students: { rut: string; name: string; paralelo: number | null }[];
  maxComparedStudents: number;
};

export type ChartUnit = "students" | "percent" | "seconds" | "steps" | "level" | "count";

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
  items: {
    label: string;
    value: string;
    hint?: string;
    /** Listas de estudiantes que se abren al tocar la tarjeta (quienes si, quienes no). */
    lists?: { title: string; columns: string[]; rows: (string | number | null)[][] }[];
  }[];
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
  /** Al quitar partes del grafico: el puesto original de cada categoria que queda, para que conserve su color. */
  categorySlots?: number[];
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
  /** Lo escrito en «Cantidad de partidas»: cuantas partidas de cada estudiante se miran, o vacio (todas). */
  partida: string;
  /** Con una cantidad de partidas: si son las primeras o las ultimas del periodo. */
  take: TakeId;
  /** Contar estudiantes (lo normal) o partidas; con una sola partida por estudiante da lo mismo. */
  countBy: CountBy;
  /** Un periodo de la lista o «range»: el rango escrito en `range`. */
  period: PeriodId | "range";
  /** El admin ya eligio un periodo (aunque sea «Todo el tiempo»); con un numero de partida es obligatorio. */
  periodChosen: boolean;
  range: DateRangeInput;
  /** Al comparar por fechas: los rangos (de 2 a maxDateRanges). */
  ranges: DateRangeInput[];
  filters: Filters;
  age: AgeInput;
  options: Record<string, string>;
};

/** Un grafico de la ficha de un estudiante, con su explicacion. */
export type StudentProfileChart = {
  id: ChartId;
  title: string;
  description: string;
  result: ChartResult;
};

/** Todo lo que se sabe de un estudiante en las estadisticas del admin. */
export type StudentProfile = {
  student: {
    rut: string;
    name: string;
    paralelo: number | null;
    university: string;
    shift: string;
    ciudad: string;
    enabled: boolean;
  };
  /** Resumen en tarjetas (un solo bloque). */
  cards: ChartCards;
  /** Cada partida, de la mas reciente a la mas antigua. */
  history: { columns: string[]; rows: (string | number | null)[][] };
  /** Los graficos de cada juego; `played` dice si el estudiante ya lo jugo. */
  games: { game: GameId; label: string; played: boolean; charts: StudentProfileChart[] }[];
  /** Como se comparo con su grupo y otras aclaraciones. */
  notes: string[];
  generatedAt: string;
};
