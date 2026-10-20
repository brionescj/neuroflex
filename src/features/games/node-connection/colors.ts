import type { NodeColorId } from "./types";

export type NodeColorShape =
  | "dot"
  | "triangle"
  | "square"
  | "diamond"
  | "plus"
  | "hexagon"
  | "ring"
  | "star";

export type NodeColorInfo = {
  id: NodeColorId;

  /** Letra con la que se escribe este color en la definicion de un nivel. */
  letter: string;

  label: string;

  hex: string;

  /**
   * Cada color lleva ademas una forma dentro del nodo: asi no se depende
   * solo del color para distinguir los pares (daltonismo).
   */
  shape: NodeColorShape;
};

export const NODE_COLORS: NodeColorInfo[] = [
  { id: "red", letter: "R", label: "rojo", hex: "#ef4444", shape: "dot" },
  { id: "blue", letter: "B", label: "azul", hex: "#3b82f6", shape: "triangle" },
  { id: "yellow", letter: "Y", label: "amarillo", hex: "#facc15", shape: "square" },
  { id: "green", letter: "G", label: "verde", hex: "#22c55e", shape: "diamond" },
  { id: "orange", letter: "O", label: "naranja", hex: "#f97316", shape: "plus" },
  { id: "pink", letter: "P", label: "rosado", hex: "#ec4899", shape: "hexagon" },
  { id: "cyan", letter: "C", label: "celeste", hex: "#06b6d4", shape: "ring" },
  { id: "white", letter: "W", label: "blanco", hex: "#e4e4e7", shape: "star" },
];

const BY_ID = new Map(NODE_COLORS.map((c) => [c.id, c]));

export function getNodeColor(id: NodeColorId): NodeColorInfo {
  const color = BY_ID.get(id);

  if (!color) {
    throw new Error(`Color de nodo desconocido: ${id}`);
  }

  return color;
}
