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

export type NodeLevelResult = {
  level: number;

  pairCount: number;

  /** Tiempo activo hasta completar el nivel, incluido el de antes de un F5. */
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
};
