export type NodeColorId =
  | "red"
  | "blue"
  | "yellow"
  | "green"
  | "orange"
  | "pink"
  | "cyan"
  | "white";

export type Cell = { row: number; col: number };

export type NodePair = {
  color: NodeColorId;

  a: Cell;

  b: Cell;
};

export type NodeLevel = {
  /** Numero de nivel, desde 1. */
  id: number;

  rows: number;

  cols: number;

  pairs: NodePair[];
};

/**
 * Trazo de cada color: lista de celdas contiguas. Siempre arranca en uno de
 * los dos nodos del color; esta completo cuando termina en el otro.
 */
export type NodePaths = Partial<Record<NodeColorId, Cell[]>>;

/**
 * Contadores de un nivel sobre como se fue armando la ruta. "Celdas" son las
 * casillas dibujadas por el jugador: los nodos de color no cuentan.
 */
export type NodeStats = {
  /** Veces que se apoyo el dedo e inicio o retomo un trazo. */
  strokesStarted: number;

  /** Celdas borradas al volver sobre el propio trazo (retroceder). */
  backtrackCells: number;

  /** Gestos (apoyar y soltar) en los que se retrocedio al menos una celda. */
  backtrackGestures: number;

  /** Veces que se rehizo una ruta ya dibujada, empezando de nuevo desde un nodo o una celda. */
  routeRestarts: number;

  /** Celdas borradas al rehacer una ruta. */
  restartCells: number;

  /** Celdas borradas al rehacer el tablero completo. */
  resetCells: number;

  /** Veces que un trazo choco con una celda ocupada. */
  blockedCount: number;
};

/**
 * Lo que hizo el jugador dentro de un nivel, con `t` en ms de tiempo activo
 * desde el inicio del nivel (sigue contando tras un F5):
 * - start: apoyo el dedo e inicio o retomo un trazo; `restartCells` si al
 *   hacerlo borro parte de una ruta ya dibujada.
 * - end: solto el dedo; `len` es el largo del trazo, `done` si conecto el par
 *   y `back` las celdas que retrocedio durante el gesto.
 * - undo / reset: uso "Deshacer" / "Rehacer tablero" (`cells`: lo que borro).
 * - blocked: el trazo choco con una celda ocupada.
 */
export type NodeEvent =
  | {
      t: number;
      type: "start";
      color: NodeColorId;
      row: number;
      col: number;
      restartCells?: number;
    }
  | {
      t: number;
      type: "end";
      color: NodeColorId;
      len: number;
      done: boolean;
      back: number;
    }
  | { t: number; type: "undo" }
  | { t: number; type: "reset"; cells: number }
  | { t: number; type: "blocked"; row: number; col: number };

export type NodeLevelResult = {
  level: number;

  /** Intento dentro del nivel (1 a 3). Cada intento es el mismo tablero, con los errores en cero. */
  tryNumber: number;

  /** El tablero quedo resuelto (un intento que agoto sus errores termina sin resolver). */
  solved: boolean;

  /** Resuelto sin superar los errores que se permiten en el nivel. */
  passed: boolean;

  pairCount: number;

  /** Tiempo activo hasta completar (o perder) el intento, incluido el de antes de un F5. */
  timeMs: number;

  /** Veces que uso "Deshacer" en el nivel. */
  undoCount: number;

  /** Veces que uso "Rehacer tablero". */
  resetCount: number;

  /** Lo mismo que timeMs sin la inactividad de mas de 80 s. Ausente en partidas guardadas antes del registro. */
  activeMsNet?: number;

  /** ISO 8601. */
  completedAt?: string;

  /** Ausente en partidas guardadas antes de registrar estos datos. */
  stats?: NodeStats;

  /** Bitacora del nivel. Ausente en partidas guardadas antes de registrarla. */
  events?: NodeEvent[];

  /** Eventos que no se guardaron por superar el tope de la bitacora. */
  eventsDropped?: number;
};
