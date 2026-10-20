import { NODE_COLORS } from "./colors";
import type { Cell, NodeColorId, NodeLevel, NodePair } from "./types";

const LETTER_TO_COLOR = new Map<string, NodeColorId>(
  NODE_COLORS.map((c) => [c.letter, c.id]),
);

/**
 * Convierte la definicion de un nivel en texto en un NodeLevel.
 *
 *   "R..B"        '.' es una celda vacia; cada letra marca un nodo y debe
 *   ".YY."        aparecer exactamente dos veces (los dos extremos del par).
 *
 * Las letras son las de NODE_COLORS (R, B, Y, G, O, P, C). Si algo no cuadra
 * se lanza un error: un nivel mal escrito debe fallar al cargar, no jugarse.
 */
export function parseLevel(id: number, layout: string[]): NodeLevel {
  if (layout.length === 0) {
    throw new Error(`Nivel ${id}: el tablero esta vacio.`);
  }

  const cols = (layout[0] as string).length;

  if (cols === 0 || layout.some((row) => row.length !== cols)) {
    throw new Error(`Nivel ${id}: las filas no tienen el mismo largo.`);
  }

  const found = new Map<NodeColorId, Cell[]>();

  layout.forEach((rowText, row) => {
    [...rowText].forEach((char, col) => {
      if (char === ".") return;

      const color = LETTER_TO_COLOR.get(char);

      if (!color) {
        throw new Error(`Nivel ${id}: caracter desconocido "${char}".`);
      }

      found.set(color, [...(found.get(color) ?? []), { row, col }]);
    });
  });

  const pairs: NodePair[] = [];

  for (const [color, cells] of found) {
    const [a, b] = cells;

    if (cells.length !== 2 || !a || !b) {
      throw new Error(
        `Nivel ${id}: el color ${color} debe tener exactamente 2 nodos, tiene ${cells.length}.`,
      );
    }

    pairs.push({ color, a, b });
  }

  if (pairs.length === 0) {
    throw new Error(`Nivel ${id}: no tiene ningun par de nodos.`);
  }

  return { id, rows: layout.length, cols, pairs };
}
