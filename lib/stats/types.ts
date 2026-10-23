/**
 * Tipos de las estadisticas del admin. El navegador tiene su propia copia en
 * src/features/stats/types.ts (el servidor no comparte codigo con el
 * navegador): son solo tipos, asi que si divergen lo avisa el compilador al
 * leer la respuesta, no un test.
 */

import type { Period } from "./time";

export type { Period };

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
  | "cs-max-level"
  | "cs-pass-rate"
  | "cs-time"
  | "nc-levels"
  | "nc-time"
  | "mc-steps"
  | "mc-time";

/** Como comparar: sin agrupar, por una caracteristica o por estudiantes elegidos. */
export type GroupBy = "none" | "student" | DimensionId;

export type Partida = "first" | "last" | "all";

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

export type ChartUnit = "students" | "percent" | "seconds" | "steps" | "level";

/** Una serie por grupo comparado. */
export type ChartSeries = {
  key: string;
  label: string;
  /**
   * Color: 0 a 7 es el puesto en la paleta categorica; -1 es "Otros" y -2 es
   * "Sin dato" (grises). Sigue a la entidad, no a su posicion en la lista.
   */
  slot: number;
  /** Estudiantes (o partidas, segun `unitLabel`) en el grupo. */
  n: number;
  /** n bajo: el grupo es demasiado chico para sacar conclusiones. */
  lowN: boolean;
  /** Un valor por categoria; null = sin datos. */
  values: (number | null)[];
  /** Cuantos datos hay detras de cada valor. */
  ns: number[];
};

export type ChartResult = {
  chart: ChartId;
  title: string;
  kind: "bars" | "lines";
  xLabel: string;
  yLabel: string;
  unit: ChartUnit;
  /** Para el tooltip y la tabla: "estudiantes" o "partidas". */
  unitLabel: string;
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
  countBy: CountBy;
  period: Period;
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

export type StatsData = {
  students: StudentRow[];
  attempts: AttemptRow[];
  results: ResultRow[];
  /** caseKey -> titulo, para rotular los mini casos. */
  caseTitles: Record<string, string>;
};
