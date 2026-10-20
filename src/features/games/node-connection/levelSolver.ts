import type { NodeLevel } from "./types";

/**
 * Solo se usa en tests: busca por retroceso si un nivel tiene solucion,
 * es decir, si existe una forma de unir todos los pares sin que los trazos
 * se toquen. No exige cubrir todo el tablero (igual que el juego).
 *
 * Es una busqueda de fuerza bruta con poda; sirve para tableros de este
 * tamano (hasta 7x7) y se rinde si agota `nodeBudget`, para no colgar un test.
 */
export type SolveOutcome = "solved" | "unsolvable" | "gave-up";

class GaveUp extends Error {}

export function solveLevel(
  level: NodeLevel,
  nodeBudget = 5_000_000,
): SolveOutcome {
  const { rows, cols } = level;
  const total = rows * cols;
  const index = (row: number, col: number) => row * cols + col;

  const owner = new Int16Array(total).fill(-1);

  const targets = level.pairs.map((pair) => ({
    from: index(pair.a.row, pair.a.col),
    to: index(pair.b.row, pair.b.col),
  }));

  targets.forEach((t, color) => {
    owner[t.from] = color;
    owner[t.to] = color;
  });

  // Los pares mas lejanos primero: son los que mas estorban.
  const order = targets
    .map((_, color) => color)
    .sort((x, y) => distance(y) - distance(x));

  function distance(color: number): number {
    const t = targets[color] as { from: number; to: number };
    return (
      Math.abs(Math.floor(t.from / cols) - Math.floor(t.to / cols)) +
      Math.abs((t.from % cols) - (t.to % cols))
    );
  }

  function neighbors(cell: number): number[] {
    const row = Math.floor(cell / cols);
    const col = cell % cols;
    const result: number[] = [];

    if (row > 0) result.push(cell - cols);
    if (row < rows - 1) result.push(cell + cols);
    if (col > 0) result.push(cell - 1);
    if (col < cols - 1) result.push(cell + 1);

    return result;
  }

  // Hay camino libre entre los dos nodos de `color`?
  function connectable(color: number, from: number, to: number): boolean {
    const seen = new Uint8Array(total);
    const stack = [from];
    seen[from] = 1;

    while (stack.length > 0) {
      const cell = stack.pop() as number;
      if (cell === to) return true;

      for (const next of neighbors(cell)) {
        if (seen[next]) continue;
        const o = owner[next] as number;
        if (o !== -1 && !(o === color && next === to)) continue;
        seen[next] = 1;
        stack.push(next);
      }
    }

    return false;
  }

  function remainingConnectable(position: number): boolean {
    for (let i = position; i < order.length; i++) {
      const color = order[i] as number;
      const t = targets[color] as { from: number; to: number };
      if (!connectable(color, t.from, t.to)) return false;
    }

    return true;
  }

  let budget = nodeBudget;

  function route(position: number): boolean {
    if (position === order.length) return true;

    const color = order[position] as number;
    const t = targets[color] as { from: number; to: number };

    return extend(t.from, color, t.to, position);
  }

  function extend(
    head: number,
    color: number,
    target: number,
    position: number,
  ): boolean {
    if (--budget < 0) throw new GaveUp();

    const toRow = Math.floor(target / cols);
    const toCol = target % cols;

    const options = neighbors(head).sort(
      (x, y) =>
        Math.abs(Math.floor(x / cols) - toRow) +
        Math.abs((x % cols) - toCol) -
        (Math.abs(Math.floor(y / cols) - toRow) +
          Math.abs((y % cols) - toCol)),
    );

    for (const next of options) {
      if (next === target) {
        if (remainingConnectable(position + 1) && route(position + 1)) {
          return true;
        }
        continue;
      }

      if (owner[next] !== -1) continue;

      owner[next] = color;

      if (
        connectable(color, next, target) &&
        remainingConnectable(position + 1) &&
        extend(next, color, target, position)
      ) {
        return true;
      }

      owner[next] = -1;
    }

    return false;
  }

  try {
    return route(0) ? "solved" : "unsolvable";
  } catch (error) {
    if (error instanceof GaveUp) return "gave-up";
    throw error;
  }
}
