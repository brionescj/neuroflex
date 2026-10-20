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

export type NodeLevelResult = {
  level: number;

  pairCount: number;

  /** Tiempo activo hasta completar el nivel, incluido el de antes de un F5. */
  timeMs: number;

  /** Veces que uso "Deshacer" en el nivel. */
  undoCount: number;

  /** Veces que uso "Reiniciar nivel". */
  resetCount: number;
};
