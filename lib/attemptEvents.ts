/**
 * Eventos finos de Seriacion de colores y Conexion de nodos: lo que el
 * estudiante hizo DENTRO de un nivel, con su momento. Reglas puras (sin base
 * de datos): validan y acotan lo que manda el navegador y calculan los
 * indicadores derivados, para probarlas con tests.
 *
 * El navegador es una fuente poco confiable: todo se valida y se acota. Los
 * eventos son informacion de contexto, nunca un puntaje: si algo no cuadra se
 * descartan (con una marca), pero el resultado del nivel se conserva.
 *
 * Los tiempos (`t`) son milisegundos de tiempo activo (pestana visible) desde
 * el inicio del nivel, o desde que se empezo a responder en seriacion.
 */

/** Copia de SEQUENCE_COLORS (src/features/games/components/ColorGrid.tsx). */
export const SEQUENCE_COLOR_IDS = ["blue", "green", "orange", "red"] as const;

/** Copia de NODE_COLORS (src/features/games/node-connection/colors.ts). */
export const NODE_COLOR_IDS = [
  "red",
  "blue",
  "yellow",
  "green",
  "orange",
  "pink",
  "cyan",
  "white",
] as const;

/** Un nivel de seriacion tiene tantos toques como colores: nivel n, n + 1. */
export const MAX_COLOR_SEQUENCE_EVENTS = 500;
export const MAX_NODE_EVENTS = 400;

const MAX_TIME_MS = 24 * 60 * 60 * 1000;
const MAX_CELL_INDEX = 49;
const MAX_CELL_COUNT = 2_500;

/** Pausa a partir de la cual se cuenta como "se quedo pensando". */
const LONG_PAUSE_MS = 5_000;

const SEQUENCE_COLORS = new Set<string>(SEQUENCE_COLOR_IDS);
const NODE_COLORS = new Set<string>(NODE_COLOR_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInt(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isTime(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_TIME_MS
  );
}

// ---------------------------------------------------------------------------
// Seriacion de colores
// ---------------------------------------------------------------------------

export type ColorTap = { c: string; t: number };

/** La secuencia que se mostro: lista de colores conocidos, o null. */
export function sanitizeShownSequence(raw: unknown): string[] | null {
  if (
    !Array.isArray(raw) ||
    raw.length < 1 ||
    raw.length > MAX_COLOR_SEQUENCE_EVENTS ||
    !raw.every((c) => typeof c === "string" && SEQUENCE_COLORS.has(c))
  ) {
    return null;
  }

  return raw as string[];
}

/**
 * Los toques de la respuesta, en el orden en que ocurrieron. Todo o nada: un
 * toque malo (o tiempos que retroceden) invalida la lista, porque el orden y la
 * posicion de cada toque es justo lo que se analiza.
 */
export function sanitizeColorTaps(raw: unknown): ColorTap[] | null {
  if (
    !Array.isArray(raw) ||
    raw.length < 1 ||
    raw.length > MAX_COLOR_SEQUENCE_EVENTS
  ) {
    return null;
  }

  const taps: ColorTap[] = [];
  let previous = 0;

  for (const item of raw) {
    if (
      !isRecord(item) ||
      typeof item.c !== "string" ||
      !SEQUENCE_COLORS.has(item.c) ||
      !isTime(item.t)
    ) {
      return null;
    }

    const t = Math.round(item.t);

    if (t < previous) return null;

    previous = t;
    taps.push({ c: item.c, t });
  }

  return taps;
}

export type ColorSequenceAnalysis = {
  /** Si el toque de cada posicion fue el color que correspondia. */
  positionCorrect: boolean[];
  /** Primera posicion errada (desde 1); null si no hubo errores. */
  firstErrorPosition: number | null;
  /** Dos posiciones seguidas con sus colores intercambiados (cuenta una vez). */
  swapErrors: number;
  /** Cualquier otra posicion errada. */
  substitutionErrors: number;
  /** Del inicio de la respuesta al primer toque. */
  firstTapMs: number;
  /** Promedio entre un toque y el siguiente; null con un solo toque. */
  meanInterTapMs: number | null;
  /** La mayor pausa entre dos toques; null con un solo toque. */
  maxPauseMs: number | null;
};

/**
 * Indicadores de una respuesta. Como el juego exige tantos toques como colores
 * tiene la secuencia, una omision no se ve como tal sino como un corrimiento:
 * aqui se distinguen intercambios y sustituciones.
 */
export function analyzeColorSequenceResponse(
  shown: string[],
  taps: ColorTap[],
): ColorSequenceAnalysis {
  const positionCorrect = shown.map((color, i) => taps[i]?.c === color);
  const first = positionCorrect.indexOf(false);

  let swapErrors = 0;
  let substitutionErrors = 0;

  for (let i = 0; i < shown.length; i++) {
    if (positionCorrect[i]) continue;

    const isSwap =
      i + 1 < shown.length &&
      !positionCorrect[i + 1] &&
      taps[i]?.c === shown[i + 1] &&
      taps[i + 1]?.c === shown[i];

    if (isSwap) {
      swapErrors += 1;
      i += 1; // la pareja ya se conto
    } else {
      substitutionErrors += 1;
    }
  }

  const gaps: number[] = [];

  for (let i = 1; i < taps.length; i++) {
    gaps.push((taps[i] as ColorTap).t - (taps[i - 1] as ColorTap).t);
  }

  return {
    positionCorrect,
    firstErrorPosition: first === -1 ? null : first + 1,
    swapErrors,
    substitutionErrors,
    firstTapMs: taps[0]?.t ?? 0,
    meanInterTapMs:
      gaps.length === 0
        ? null
        : Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length),
    maxPauseMs: gaps.length === 0 ? null : Math.max(...gaps),
  };
}

/**
 * Deja las metricas y los eventos de un nivel de seriacion en un estado
 * coherente. Si el navegador manda la secuencia y los toques, deben calzar con
 * el largo y los aciertos informados; si no calzan (o vienen mal formados) se
 * descartan y se anota `eventsDiscarded`: el nivel se guarda igual.
 *
 * Un nivel anterior a registrar eventos (sin ninguno de los dos) pasa intacto.
 */
export function reconcileColorSequenceEvents(
  metrics: Record<string, unknown>,
  rawEvents: unknown,
): { metrics: Record<string, unknown>; events: ColorTap[] | undefined } {
  const sentAnything =
    rawEvents !== undefined ||
    metrics.shownSequence !== undefined ||
    metrics.illuminationMs !== undefined;

  if (!sentAnything) return { metrics, events: undefined };

  const { shownSequence, illuminationMs, ...rest } = metrics;

  const shown = sanitizeShownSequence(shownSequence);
  const taps = sanitizeColorTaps(rawEvents);

  const consistent =
    shown !== null &&
    taps !== null &&
    shown.length === rest.sequenceLength &&
    taps.length === shown.length &&
    shown.filter((color, i) => taps[i]?.c === color).length ===
      rest.correctCount;

  if (!consistent || shown === null || taps === null) {
    return { metrics: { ...rest, eventsDiscarded: true }, events: undefined };
  }

  return {
    metrics: {
      ...rest,
      shownSequence: shown,
      ...(isTime(illuminationMs)
        ? { illuminationMs: Math.round(illuminationMs) }
        : {}),
    },
    events: taps,
  };
}

// ---------------------------------------------------------------------------
// Conexion de nodos
// ---------------------------------------------------------------------------

/**
 * Lo que se registra de un nivel:
 * - start: se apoyo el dedo y se inicio o retomo un trazo (`restartCells` si
 *   al hacerlo se borro parte de una ruta ya dibujada).
 * - end: se solto el dedo. `len` es el largo de ese trazo, `done` si conecto
 *   el par, `back` las celdas que retrocedio durante el gesto.
 * - undo: uso "Deshacer".
 * - reset: uso "Rehacer tablero" (`cells` es lo que borro).
 * - blocked: un trazo choco con una celda ocupada.
 */
export type NodeEvent = {
  t: number;
  type: "start" | "end" | "undo" | "reset" | "blocked";
  color?: string;
  row?: number;
  col?: number;
  restartCells?: number;
  len?: number;
  done?: boolean;
  back?: number;
  cells?: number;
};

function nodeEventOf(item: unknown): NodeEvent | null {
  if (!isRecord(item) || !isTime(item.t)) return null;

  const t = Math.round(item.t);

  switch (item.type) {
    case "start": {
      if (
        typeof item.color !== "string" ||
        !NODE_COLORS.has(item.color) ||
        !isInt(item.row, 0, MAX_CELL_INDEX) ||
        !isInt(item.col, 0, MAX_CELL_INDEX)
      ) {
        return null;
      }

      return {
        t,
        type: "start",
        color: item.color,
        row: item.row,
        col: item.col,
        ...(isInt(item.restartCells, 1, MAX_CELL_COUNT)
          ? { restartCells: item.restartCells }
          : {}),
      };
    }
    case "end": {
      if (
        typeof item.color !== "string" ||
        !NODE_COLORS.has(item.color) ||
        !isInt(item.len, 0, MAX_CELL_COUNT) ||
        typeof item.done !== "boolean" ||
        !isInt(item.back, 0, MAX_CELL_COUNT)
      ) {
        return null;
      }

      return {
        t,
        type: "end",
        color: item.color,
        len: item.len,
        done: item.done,
        back: item.back,
      };
    }
    case "undo":
      return { t, type: "undo" };
    case "reset":
      return isInt(item.cells, 0, MAX_CELL_COUNT)
        ? { t, type: "reset", cells: item.cells }
        : null;
    case "blocked":
      return isInt(item.row, 0, MAX_CELL_INDEX) &&
        isInt(item.col, 0, MAX_CELL_INDEX)
        ? { t, type: "blocked", row: item.row, col: item.col }
        : null;
    default:
      return null;
  }
}

/**
 * Eventos de un nivel de nodos: cada uno se limpia por separado (uno malo se
 * descarta, los demas se conservan), se ordenan por tiempo y se acota la
 * cantidad. Devuelve una lista vacia si no hay nada utilizable.
 */
export function sanitizeNodeEvents(raw: unknown): NodeEvent[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(0, MAX_NODE_EVENTS)
    .map(nodeEventOf)
    .filter((event): event is NodeEvent => event !== null)
    .sort((a, b) => a.t - b.t);
}

export type NodeAnalysis = {
  eventCount: number;
  /** Trazos iniciados (apoyar el dedo sobre un nodo o una ruta). */
  strokeStarts: number;
  /** Del inicio del nivel al primer trazo: lo que tardo en empezar. */
  firstStrokeMs: number | null;
  firstStrokeColor: string | null;
  /** Colores en el orden en que se empezaron a conectar (sin repetir). */
  colorOrder: string[];
  /** La mayor pausa entre dos eventos seguidos; null con menos de dos. */
  maxPauseMs: number | null;
  /** Pausas de 5 s o mas entre dos eventos. */
  longPauses: number;
  /** Trazos que se soltaron sin conectar el par. */
  strokesLeftOpen: number;
};

export function analyzeNodeEvents(events: NodeEvent[]): NodeAnalysis {
  const starts = events.filter((e) => e.type === "start");

  const colorOrder: string[] = [];

  for (const start of starts) {
    if (start.color && !colorOrder.includes(start.color)) {
      colorOrder.push(start.color);
    }
  }

  let maxPause: number | null = null;
  let longPauses = 0;

  for (let i = 1; i < events.length; i++) {
    const gap = (events[i] as NodeEvent).t - (events[i - 1] as NodeEvent).t;

    maxPause = maxPause === null ? gap : Math.max(maxPause, gap);
    if (gap >= LONG_PAUSE_MS) longPauses += 1;
  }

  return {
    eventCount: events.length,
    strokeStarts: starts.length,
    firstStrokeMs: starts[0]?.t ?? null,
    firstStrokeColor: starts[0]?.color ?? null,
    colorOrder,
    maxPauseMs: maxPause,
    longPauses,
    strokesLeftOpen: events.filter((e) => e.type === "end" && e.done === false)
      .length,
  };
}
