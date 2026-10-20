import type { Cell, NodeColorId, NodeLevel, NodePaths } from "./types";

/**
 * Reglas del tablero, sin nada de React ni de DOM: todo son funciones puras
 * que reciben un estado y devuelven el siguiente. Asi se prueban sin un
 * navegador y el hook solo orquesta.
 *
 * Regla de fondo: una linea nunca entra en una celda ocupada por el trazo o
 * el nodo de otro color (el enunciado pide que no se crucen ni invadan). Para
 * liberar una celda hay que acortar el trazo que la ocupa.
 */

/** Cuanto debe entrar el puntero en la celda vecina para que cuente (en celdas). */
export const HYSTERESIS = 0.15;

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function areAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function inBounds(level: NodeLevel, cell: Cell): boolean {
  return (
    Number.isInteger(cell.row) &&
    Number.isInteger(cell.col) &&
    cell.row >= 0 &&
    cell.row < level.rows &&
    cell.col >= 0 &&
    cell.col < level.cols
  );
}

export function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

/** Color del que es nodo esta celda, si lo es. */
export function endpointColorAt(
  level: NodeLevel,
  cell: Cell,
): NodeColorId | undefined {
  return level.pairs.find((p) => sameCell(p.a, cell) || sameCell(p.b, cell))
    ?.color;
}

/** Color cuyo trazo pasa por esta celda, si alguno. */
export function pathColorAt(
  paths: NodePaths,
  cell: Cell,
): NodeColorId | undefined {
  for (const [color, cells] of Object.entries(paths)) {
    if (cells?.some((c) => sameCell(c, cell))) return color as NodeColorId;
  }

  return undefined;
}

function pairOf(level: NodeLevel, color: NodeColorId) {
  return level.pairs.find((p) => p.color === color);
}

export function isPathComplete(
  level: NodeLevel,
  paths: NodePaths,
  color: NodeColorId,
): boolean {
  const pair = pairOf(level, color);
  const cells = paths[color];

  if (!pair || !cells || cells.length < 2) return false;

  const first = cells[0] as Cell;
  const last = cells[cells.length - 1] as Cell;
  const other = sameCell(first, pair.a) ? pair.b : pair.a;

  return sameCell(last, other);
}

export function connectedCount(level: NodeLevel, paths: NodePaths): number {
  return level.pairs.filter((p) => isPathComplete(level, paths, p.color))
    .length;
}

export function isSolved(level: NodeLevel, paths: NodePaths): boolean {
  return connectedCount(level, paths) === level.pairs.length;
}

function withPath(
  paths: NodePaths,
  color: NodeColorId,
  cells: Cell[],
): NodePaths {
  return { ...paths, [color]: cells };
}

export type StrokeStart = { paths: NodePaths; color: NodeColorId };

/**
 * Se apoya el dedo (o se aprieta el boton) sobre una celda. Devuelve el
 * trazo que queda activo, o null si no hay nada que dibujar ahi.
 *
 * - Sobre un nodo: se empieza un trazo nuevo de ese color (borra el anterior).
 * - Sobre el trazo de un color: se acorta hasta esa celda y se sigue desde ahi.
 *   Es la forma de recuperar celdas que otro trazo esta bloqueando.
 */
export function startStroke(
  level: NodeLevel,
  paths: NodePaths,
  cell: Cell,
): StrokeStart | null {
  if (!inBounds(level, cell)) return null;

  const owner = pathColorAt(paths, cell);

  if (owner) {
    const cells = paths[owner] as Cell[];
    const index = cells.findIndex((c) => sameCell(c, cell));
    const isLast = index === cells.length - 1;

    // Tocar el otro nodo de un trazo ya completo: se vuelve a empezar desde
    // ahi, no se "continua" (ya no hay hacia donde seguir).
    if (isLast && isPathComplete(level, paths, owner)) {
      return { paths: withPath(paths, owner, [cell]), color: owner };
    }

    if (isLast) return { paths, color: owner };

    return { paths: withPath(paths, owner, cells.slice(0, index + 1)), color: owner };
  }

  const nodeColor = endpointColorAt(level, cell);

  if (nodeColor) {
    return { paths: withPath(paths, nodeColor, [cell]), color: nodeColor };
  }

  return null;
}

export type ExtendResult =
  | { kind: "moved"; paths: NodePaths }
  | { kind: "blocked" };

/**
 * Un paso del trazo activo hacia una celda vecina de su cabeza.
 */
export function extendStroke(
  level: NodeLevel,
  paths: NodePaths,
  color: NodeColorId,
  target: Cell,
): ExtendResult {
  const cells = paths[color];

  if (!cells || cells.length === 0 || !inBounds(level, target)) {
    return { kind: "blocked" };
  }

  const head = cells[cells.length - 1] as Cell;

  if (!areAdjacent(head, target)) return { kind: "blocked" };

  // Volver sobre la celda anterior acorta el trazo (siempre permitido, aun
  // si el trazo estaba completo).
  const previous = cells[cells.length - 2];
  if (previous && sameCell(previous, target)) {
    return { kind: "moved", paths: withPath(paths, color, cells.slice(0, -1)) };
  }

  // Un trazo completo no admite mas celdas.
  if (isPathComplete(level, paths, color)) return { kind: "blocked" };

  // Cruzar el propio trazo lo recorta hasta ese punto.
  const ownIndex = cells.findIndex((c) => sameCell(c, target));
  if (ownIndex !== -1) {
    return {
      kind: "moved",
      paths: withPath(paths, color, cells.slice(0, ownIndex + 1)),
    };
  }

  const occupant = pathColorAt(paths, target);
  if (occupant && occupant !== color) return { kind: "blocked" };

  const node = endpointColorAt(level, target);
  if (node && node !== color) return { kind: "blocked" };

  return { kind: "moved", paths: withPath(paths, color, [...cells, target]) };
}

export type AdvanceResult = {
  paths: NodePaths;

  /** Celda donde el trazo choco, si se detuvo antes de llegar. */
  blockedAt: Cell | null;
};

/**
 * Lleva la cabeza del trazo hacia `target` celda por celda, sin saltarse
 * ninguna: un dedo que se mueve rapido puede haber cruzado varias celdas
 * entre dos eventos. Cada paso es ortogonal (nunca en diagonal), eligiendo el
 * eje con mayor distancia. Se detiene en la primera celda que no se puede
 * pisar.
 */
export function advanceStroke(
  level: NodeLevel,
  paths: NodePaths,
  color: NodeColorId,
  target: Cell,
): AdvanceResult {
  let current = paths;
  const maxSteps = level.rows + level.cols;

  for (let i = 0; i < maxSteps; i++) {
    const cells = current[color];
    const head = cells?.[cells.length - 1];

    if (!head || sameCell(head, target)) break;

    const dRow = target.row - head.row;
    const dCol = target.col - head.col;

    const next: Cell =
      Math.abs(dRow) >= Math.abs(dCol)
        ? { row: head.row + Math.sign(dRow), col: head.col }
        : { row: head.row, col: head.col + Math.sign(dCol) };

    const step = extendStroke(level, current, color, next);

    if (step.kind === "blocked") {
      return { paths: current, blockedAt: next };
    }

    current = step.paths;
  }

  return { paths: current, blockedAt: null };
}

/**
 * Convierte una posicion del puntero (en unidades de celda, con el origen en
 * la esquina del tablero) en la celda que se quiere tocar.
 *
 * Con `anchor` (la cabeza del trazo) se aplica histeresis: pasar justo el borde
 * hacia una celda vecina no cuenta hasta que el puntero entra HYSTERESIS en
 * ella. Sin esto, un dedo que roza una esquina se cuela en la celda vecina.
 * Fuera del tablero se ajusta al borde mas cercano.
 */
export function pointToCell(
  level: NodeLevel,
  fx: number,
  fy: number,
  anchor?: Cell,
): Cell {
  let col = Math.floor(fx);
  let row = Math.floor(fy);

  if (anchor) {
    if (col !== anchor.col && Math.abs(fx - (anchor.col + 0.5)) < 0.5 + HYSTERESIS) {
      col = anchor.col;
    }

    if (row !== anchor.row && Math.abs(fy - (anchor.row + 0.5)) < 0.5 + HYSTERESIS) {
      row = anchor.row;
    }
  }

  return {
    row: Math.min(level.rows - 1, Math.max(0, row)),
    col: Math.min(level.cols - 1, Math.max(0, col)),
  };
}

/**
 * Comprueba que un conjunto de trazos es un estado posible del tablero. Se
 * usa al reanudar: el avance viene de la base de datos y no se confia en el.
 */
export function arePathsValid(level: NodeLevel, paths: NodePaths): boolean {
  const seen = new Set<string>();

  for (const [color, cells] of Object.entries(paths)) {
    if (!cells) continue;

    const pair = pairOf(level, color as NodeColorId);
    if (!pair || cells.length === 0) return false;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i] as Cell;

      if (!inBounds(level, cell)) return false;

      const key = cellKey(cell);
      if (seen.has(key)) return false;
      seen.add(key);

      if (i > 0 && !areAdjacent(cells[i - 1] as Cell, cell)) return false;

      const node = endpointColorAt(level, cell);
      const isFirst = i === 0;
      const isLast = i === cells.length - 1;

      if (isFirst) {
        if (!sameCell(cell, pair.a) && !sameCell(cell, pair.b)) return false;
      } else if (node !== undefined) {
        // Un nodo solo puede aparecer en el trazo de su propio color, y como
        // celda final (el otro extremo).
        if (node !== color || !isLast) return false;
      }
    }
  }

  return true;
}
