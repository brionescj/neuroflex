import { SEQUENCE_COLORS } from "./colorSequenceColors";
import type { SequenceColorId } from "./colorSequenceConfig";

function pickRandomColorId(exclude: Set<SequenceColorId>): SequenceColorId {
  const pool = SEQUENCE_COLORS.filter((color) => !exclude.has(color.id));
  const candidates = pool.length > 0 ? pool : SEQUENCE_COLORS;
  const index = Math.floor(Math.random() * candidates.length);
  const color = candidates[index];

  if (!color) {
    throw new Error("Indice fuera de rango en SEQUENCE_COLORS.");
  }

  return color.id;
}

/**
 * El color nuevo no puede repetir ninguno de los dos colores anteriores:
 * ni el inmediatamente previo (evita "rojo, rojo") ni el que esta dos
 * posiciones atras (evita el patron ABA tipo "amarillo, rojo, amarillo",
 * que es mas facil de recordar por la repeticion cercana).
 */
function nextColorId(previousSequence: SequenceColorId[]): SequenceColorId {
  const forbidden = new Set(previousSequence.slice(-2));
  return pickRandomColorId(forbidden);
}

function randomSequence(length: number): SequenceColorId[] {
  const sequence: SequenceColorId[] = [];

  for (let i = 0; i < length; i++) {
    sequence.push(nextColorId(sequence));
  }

  return sequence;
}

/**
 * Si `candidate` y `other` empiezan igual en todas las posiciones que tienen
 * en comun. Es el caso de una secuencia que es la otra mas colores al final
 * (o identica a ella).
 */
export function startsTheSame(
  candidate: SequenceColorId[],
  other: SequenceColorId[],
): boolean {
  const shared = Math.min(candidate.length, other.length);

  if (shared === 0) return false;

  return candidate.slice(0, shared).every((color, i) => color === other[i]);
}

const MAX_DRAWS = 100;

/**
 * Secuencia nueva y aleatoria del largo pedido, con las reglas de
 * aleatoriedad (sin repetir los dos colores anteriores). Cada nivel y cada
 * reintento usan una secuencia propia: si se pasa `previous` (la del intento
 * anterior), la nueva nunca es esa misma ni la empieza igual, de modo que
 * un nivel no sea "el anterior mas un color".
 */
export function buildSequence(
  length: number,
  previous: SequenceColorId[] = [],
): SequenceColorId[] {
  let sequence = randomSequence(length);

  for (let i = 0; i < MAX_DRAWS && startsTheSame(sequence, previous); i++) {
    sequence = randomSequence(length);
  }

  return sequence;
}
