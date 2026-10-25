/**
 * Tipos de las estadisticas del admin. El navegador tiene su propia copia en
 * src/features/stats/types.ts (el servidor no comparte codigo con el
 * navegador): son solo tipos, asi que si divergen lo avisa el compilador al
 * leer la respuesta, no un test.
 */

import type { DateRange, Period } from "./time";

export type { DateRange, Period };

export type GameId = "color-sequence" | "mini-cases" | "node-connection";

export const GAME_IDS: readonly GameId[] = [
  "color-sequence",
  "node-connection",
  "mini-cases",
];

export const GAME_LABELS: Record<GameId, string> = {
  "color-sequence": "Seriación de colores",
  "node-connection": "Conexión de nodos",
  "mini-cases": "Mini casos",
};

/** "general" agrupa los graficos que no son de un solo juego. */
export type StatGame = GameId | "general";

export const STAT_GAMES: readonly StatGame[] = [
  "general",
  "color-sequence",
  "node-connection",
  "mini-cases",
];

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
  | "st-levels"
  | "st-restarts"
  /** Solo en la evolucion de un estudiante (promedios por semana o por mes). */
  | "ev-count"
  | "ev-level"
  | "ev-time"
  | "ev-steps";

/**
 * Formas de ver un grafico. La tabla siempre esta disponible aparte. Torta y
 * apiladas solo se ofrecen cuando los valores son partes de un total.
 */
export type ViewId = "bars" | "lines" | "pie" | "stacked" | "cards";

/** Como comparar: sin agrupar, por una caracteristica, por estudiantes elegidos o por rangos de fechas. */
export type GroupBy = "none" | "student" | "dateRange" | DimensionId;

/** Cuantas partidas de cada estudiante se miran (dentro del periodo elegido). null = todas. */
export type Partida = number | null;

/** Cuales de esas partidas: las primeras (mas antiguas) o las ultimas (mas recientes) del periodo. */
export type Take = "first" | "last";

/** La partida mas alta que se puede pedir. */
export const MAX_PARTIDA = 500;

/** Que se cuenta cuando se miran todas las partidas: estudiantes (por defecto) o partidas. */
export type CountBy = "students" | "attempts";

export type Filters = Partial<Record<DimensionId, string[]>>;

/** Rango de edad pedido por el admin; un extremo en null queda abierto. */
export type AgeRange = { min: number | null; max: number | null };

export type OptionChoice = { value: string; label: string };

export type ChartOptionDef = {
  id: string;
  label: string;
  choices: OptionChoice[];
  /** Lo que se usa si el navegador no manda nada. */
  default: string;
};

export type ChartUnit = "students" | "percent" | "seconds" | "steps" | "level" | "count";

/** Una serie por grupo comparado. */
export type ChartSeries = {
  key: string;
  label: string;
  /**
   * Color: 0 a 7 es el puesto en la paleta categorica; -1 es "Otros" y -2 es
   * "Sin dato" (grises). Sigue a la entidad, no a su posicion en la lista.
   */
  slot: number;
  /** Estudiantes distintos del grupo (lo que se cuenta en cada punto, `ns`, se mide en `unitLabel`). */
  n: number;
  /** Un valor por categoria; null = sin datos. */
  values: (number | null)[];
  /** Cuantos datos hay detras de cada valor. */
  ns: number[];
  /**
   * Cuando el valor es la parte de un total («22 de 29»): la parte y el total de cada categoria.
   * Los graficos de tiempo, pasos o niveles (promedios, medianas) no los llevan.
   */
  part?: (number | null)[];
  total?: (number | null)[];
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
  /** Formas de ver el grafico; la primera es la de partida. */
  views: ViewId[];
  /** Indicador exploratorio: orienta, pero no concluye por si solo. */
  /** Con cuantos datos se calculo, en una frase («Calculado con 14 partidas…»); solo en la vista de un estudiante. */
  basis?: string;
  /** Aclaracion bajo la leyenda, para entender que es cada serie. */
  legendNote?: string;
  /** Leyenda de lectura: que se puede deducir del grafico; va antes de «Como se calculo». */
  deduction?: string;
  exploratory: boolean;
  /** Si viene, la vista de tabla muestra esto en vez de categorias por series. */
  table?: ChartTable;
  cards?: ChartCards;
  xLabel: string;
  yLabel: string;
  unit: ChartUnit;
  /** Para el tooltip y la tabla: "estudiantes" o "partidas". */
  unitLabel: string;
  /**
   * Frases que completan «estudiantes …» cuando el valor es una parte de un total: «que lo superaron» y
   * «que jugaron el nivel» dan «Estudiantes que lo superaron» y «22 estudiantes de un total de 29 que jugaron el nivel».
   */
  partLabel?: string;
  totalLabel?: string;
  categories: string[];
  series: ChartSeries[];
  /** Avisos para mostrar junto al grafico (n bajo, datos faltantes...). */
  warnings: string[];
  /** Aclaraciones sobre como se calculo. */
  notes: string[];
  /** Cantidad de estudiantes distintos que alimentan el grafico. */
  studentsTotal: number;
  generatedAt: string;
};

export type ChartRequest = {
  chart: ChartId;
  groupBy: GroupBy;
  partida: Partida;
  /** Con una cantidad de partidas: si son las primeras o las ultimas del periodo. */
  take: Take;
  countBy: CountBy;
  period: Period;
  /** Rango de fechas elegido a mano en lugar de un periodo. null = no hay. */
  range: DateRange | null;
  /** Los rangos que se comparan (solo con groupBy "dateRange"). */
  ranges: DateRange[];
  filters: Filters;
  /** null = sin filtrar por edad. */
  ageRange: AgeRange | null;
  students: string[];
  options: Record<string, string>;
};

export type AttemptRow = {
  attemptId: string;
  studentRut: string;
  gameId: GameId;
  attemptNumber: number;
  status: "in_progress" | "finished" | "failed";
  startedAt: Date;
  lastActivityAt: Date;
  finishedAt?: Date | null;
  contentVersion: string;
  /** Al comparar por rangos de fechas: a cual rango (0, 1...) pertenece esta copia de la partida. */
  range?: number;
  /** Solo se lee el dispositivo de la primera sesion. */
  sessions?: {
    device?: { pointer?: string; viewportWidth?: number; viewportHeight?: number } | null;
  }[];
  student?: {
    paralelo?: number | null;
    entryYear?: number | null;
    ageAtStart?: number | null;
    studyShift?: string | null;
    ciudad?: string | null;
    region?: string | null;
    gender?: string | null;
    university?: string | null;
  } | null;
};

export type ResultRow = {
  attemptId: string;
  studentRut: string;
  gameId: GameId;
  key: string;
  index: number;
  tryNumber: number;
  metrics: Record<string, unknown>;
  activeMsNet: number;
  completedAt: Date;
};

export type StudentRow = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  paralelo?: number | null;
  entryYear?: number | null;
  birthDate?: string | null;
  studyShift?: string | null;
  gender?: string | null;
  university?: string | null;
  region?: string | null;
  ciudad?: string | null;
  enabled?: boolean;
};

export type UnlockRow = {
  studentRut: string;
  gameId: GameId;
  unlockedAt: Date;
};

export type StatsData = {
  students: StudentRow[];
  attempts: AttemptRow[];
  results: ResultRow[];
  /** Desbloqueos de juegos (solo si el grafico los necesita). */
  unlocks?: UnlockRow[];
  /** caseKey -> titulo, para rotular los mini casos. */
  caseTitles: Record<string, string>;
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
  /** Los graficos de cada juego; `played` dice si el estudiante ya lo jugo. */
  games: {
    game: GameId;
    label: string;
    played: boolean;
    attempts: number;
    breakdown: GameBreakdown;
    charts: StudentProfileChart[];
  }[];
  /** Como se calcularon las tarjetas del resumen y con quien se compararon. */
  notes: string[];
  generatedAt: string;
};

/** Como terminan las partidas: una partida sin terminar sigue abierta, y si el estudiante vuelve la retoma. */
export type AttemptState = "finished" | "failed" | "open";

/** Las partidas de un juego segun como terminaron, y cuantas entran en sus graficos. */
export type GameBreakdown = {
  total: number;
  finished: number;
  failed: number;
  open: number;
  /** Los estados elegidos para los graficos de este juego (todos, si no se elige). */
  states: AttemptState[];
  /** Partidas de esos estados. */
  selected: number;
  /** De las elegidas, las que guardaron al menos un resultado: las unicas que se pueden graficar. */
  withData: number;
};

/** Una pagina del historial «partida a partida», de la mas reciente a la mas antigua. */
export type HistoryPage = {
  columns: string[];
  rows: (string | number | null)[][];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

export type EvolutionBy = "week" | "month";

export type EvolutionSpan = "1" | "2" | "3" | "6" | "9" | "12" | "all";

/** Promedios del estudiante por semana o por mes, un bloque de graficos por juego. */
export type StudentEvolution = {
  by: EvolutionBy;
  span: EvolutionSpan;
  /** «Promedios por semana · último mes». */
  label: string;
  games: { game: GameId; label: string; played: boolean; partidas: number; charts: StudentProfileChart[] }[];
  notes: string[];
  generatedAt: string;
};
