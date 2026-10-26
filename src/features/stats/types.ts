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
  | "nc-levels"
  | "nc-pass-rate"
  | "nc-time"
  | "nc-reach"
  | "nc-tries"
  | "nc-errors"
  | "nc-corrections"
  | "nc-correction-mix"
  | "mc-steps"
  | "mc-time"
  | "mc-options"
  /** Solo en la ficha de un estudiante (no estan en el catalogo). */
  | "st-time"
  | "st-levels"
  | "st-restarts"
  /** Solo en la evolucion de un estudiante (promedios por semana o por mes). */
  | "ev-count"
  | "ev-level"
  | "ev-time"
  | "ev-steps";

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
  /** Todos los estudiantes (tambien los inhabilitados) para elegir a quien ver en «Desempeño». */
  studentTable: { rut: string; name: string; paralelo: number | null; university: string; enabled: boolean }[];
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
  /** Cuando el valor es la parte de un total («22 de 29»): la parte y el total de cada categoria. */
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
    lists?: {
      title: string;
      /** Aclaracion que el PDF agrega entre parentesis al final del titulo de la lista. */
      note?: string;
      columns: string[];
      rows: (string | number | null)[][];
    }[];
  }[];
}[];

export type ChartResult = {
  chart: ChartId;
  title: string;
  /** Formas de ver el grafico; la primera es la de partida. Vacio: solo tabla. */
  views: ViewId[];
  /** Con cuantos datos se calculo, en una frase («Calculado con 14 partidas…»); solo en la vista de un estudiante. */
  basis?: string;
  /** Aclaracion bajo la leyenda, para entender que es cada serie. */
  legendNote?: string;
  /** Leyenda de lectura: que se puede deducir del grafico; va antes de «Como se calculo». */
  deduction?: string;
  exploratory: boolean;
  table?: ChartTable;
  cards?: ChartCards;
  /** El PDF lleva solo las listas con su titulo, sin el dibujo de las tarjetas. */
  pdfListsOnly?: boolean;
  xLabel: string;
  yLabel: string;
  unit: ChartUnit;
  unitLabel: string;
  /** Frases que completan «estudiantes …»: «que lo superaron», «que jugaron el nivel». */
  partLabel?: string;
  totalLabel?: string;
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
  /** Otras caracteristicas que se cruzan con `groupBy` (hasta 2): «universidad y género», por ejemplo. */
  alsoBy: DimensionId[];
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
  /** Cual partida es cada fila (mismo orden que `rows`): lo que se pide para ver sus datos. */
  attempts: { attemptId: string; game: GameId }[];
};

/** Una pieza de una secuencia (un color o un paso) dentro del detalle de una partida. */
export type PartidaItem = {
  text: string;
  /** Color de fondo, si la pieza es un color. */
  color?: string;
  /** true = en su lugar; false = fuera de lugar; ausente = no se evalua. */
  ok?: boolean;
};

/** Un nivel (o caso) de una partida, con lo que pidio el juego y lo que hizo el estudiante. */
export type PartidaRow = {
  /** «Nivel 3» o «Caso 2 · Cruzar la calle». */
  label: string;
  /** «Intento 2» (Seriacion y Nodos); null en Mini casos. */
  tryText: string | null;
  /** «Superado», «No superado», «Orden completo»… */
  result: string;
  ok: boolean | null;
  seconds: number;
  /** Secuencias para comparar: lo pedido frente a lo marcado. */
  lines: { title: string; items: PartidaItem[] }[];
  /** Datos sueltos: aciertos, errores, choques... */
  facts: { label: string; value: string }[];
  /** Cuando el nivel no guardo el detalle. */
  notice: string | null;
};

/** Los datos de una partida, nivel por nivel (seriacion), tablero por tablero (nodos) o caso por caso (mini casos). */
export type PartidaDetail = {
  attemptId: string;
  game: GameId;
  attemptNumber: number;
  /** Fecha de inicio, en hora de Chile. */
  startedAt: string;
  outcome: string;
  rows: PartidaRow[];
  notes: string[];
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