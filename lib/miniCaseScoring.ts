/**
 * Puntaje y analisis de la respuesta de un mini caso. Es la unica
 * implementacion: la usan el envio de cada caso (lo que ve el estudiante) y
 * el registro de la partida (lo que se guarda para el analisis), para que
 * ambos nunca discrepen.
 *
 * Un caso puede tener mas de una secuencia valida (`alternateOrders`, por
 * ejemplo el caso 9, que acepta 1-2-3-4 y 3-1-2-4). Se puntua contra la que
 * mas coincide, de modo que quien responde una secuencia valida distinta de
 * la principal no queda como fallido.
 */

export type ScoredOption = { optionKey: string; correctStep: number };

export type TextOption = ScoredOption & { text: string };

const OPTION_COUNT = 4;

/** Secuencia principal: las opciones ordenadas por su correctStep. */
export function primaryOrder(options: ScoredOption[]): string[] {
  return [...options]
    .sort((a, b) => a.correctStep - b.correctStep)
    .map((o) => o.optionKey);
}

/** Todas las secuencias validas: la principal primero. */
export function validOrders(
  options: ScoredOption[],
  alternateOrders: string[][] = [],
): string[][] {
  return [primaryOrder(options), ...alternateOrders];
}

/** Si `keys` contiene exactamente las claves de las opciones, una vez cada una. */
export function isPermutationOfOptions(
  options: ScoredOption[],
  keys: string[],
): boolean {
  return (
    keys.length === options.length &&
    new Set(keys).size === keys.length &&
    keys.every((key) => options.some((o) => o.optionKey === key))
  );
}

/**
 * Valida las secuencias alternativas de un caso: cada una debe ser una
 * ordenacion completa de las 4 opciones, distinta de la principal y de las
 * otras alternativas. Devuelve el mensaje del problema, o null si estan bien.
 */
export function validateAlternateOrders(
  options: ScoredOption[],
  alternateOrders: unknown,
): string | null {
  if (alternateOrders === undefined) return null;

  if (!Array.isArray(alternateOrders)) {
    return "alternateOrders debe ser una lista de secuencias.";
  }

  const seen = new Set<string>([primaryOrder(options).join("|")]);

  for (const order of alternateOrders) {
    if (
      !Array.isArray(order) ||
      !order.every((key) => typeof key === "string") ||
      !isPermutationOfOptions(options, order as string[])
    ) {
      return `Cada secuencia alternativa debe ordenar las ${OPTION_COUNT} opciones, una vez cada una.`;
    }

    const signature = (order as string[]).join("|");

    if (seen.has(signature)) {
      return "Una secuencia alternativa repite otra secuencia valida.";
    }

    seen.add(signature);
  }

  return null;
}

function matchesWith(reference: string[], ordered: string[]): number {
  return ordered.filter((key, index) => reference[index] === key).length;
}

/**
 * Pares de opciones que quedaron en orden contrario al de la secuencia de
 * referencia (distancia de Kendall, 0 a 6 con 4 opciones). Distingue un
 * error pequeno (dos vecinas intercambiadas: 1) de uno grande (orden
 * invertido: 6), que los "pasos en su lugar" no distinguen.
 */
export function kendallDistance(ordered: string[], reference: string[]): number {
  const rank = new Map(reference.map((key, index) => [key, index]));
  let inversions = 0;

  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const a = rank.get(ordered[i]!);
      const b = rank.get(ordered[j]!);

      if (a !== undefined && b !== undefined && a > b) inversions += 1;
    }
  }

  return inversions;
}

export type OrderScore = {
  correctSteps: number;
  isFullyCorrect: boolean;
  /** Que secuencia valida se uso: 0 la principal, 1 la primera alternativa... */
  matchedSequence: number;
};

/**
 * Pasos que el estudiante dejo en su lugar, contra la secuencia valida que
 * mas coincide (a igualdad gana la principal).
 */
export function scoreMiniCaseOrder(
  options: ScoredOption[],
  orderedOptionKeys: string[],
  alternateOrders: string[][] = [],
): OrderScore {
  let matchedSequence = 0;
  let correctSteps = -1;

  validOrders(options, alternateOrders).forEach((reference, index) => {
    const matches = matchesWith(reference, orderedOptionKeys);

    if (matches > correctSteps) {
      correctSteps = matches;
      matchedSequence = index;
    }
  });

  return {
    correctSteps,
    isFullyCorrect: correctSteps === options.length,
    matchedSequence,
  };
}

export type Placement = {
  /** Lugar en que el estudiante puso la opcion (1 a 4). */
  step: number;
  optionKey: string;
  /** Lugar que le correspondia en la secuencia valida usada para puntuar. */
  expectedStep: number;
  /** Posicion en que se la mostro la pantalla (1 a 4), si se conoce. */
  displayedAt: number | null;
};

export type MiniCaseAnalysis = OrderScore & {
  /** Por lugar elegido: si la opcion puesta ahi era la que correspondia. */
  positionCorrect: boolean[];
  kendallDistance: number;
  placements: Placement[];
  /** Las opciones tal como estaban en el banco cuando jugo (texto y clave). */
  options: TextOption[];
  /** Solo si el caso tiene mas de una secuencia valida. */
  validOrders?: string[][];
};

/**
 * Todo lo que se puede decir de una respuesta sin depender del navegador:
 * puntaje, aciertos por lugar, distancia al orden correcto y en que lugar
 * puso el estudiante cada opcion (aunque la pantalla las mezcle). Guarda
 * ademas el texto de las opciones de ese momento, para que un cambio
 * posterior del banco no altere lo que se analiza.
 *
 * `displayedOptionKeys` es el orden en que el navegador dice haber mostrado
 * las opciones; solo se usa si es una ordenacion valida de las opciones.
 */
export function analyzeMiniCaseOrder(
  options: TextOption[],
  alternateOrders: string[][],
  orderedOptionKeys: string[],
  displayedOptionKeys: string[] | null,
): MiniCaseAnalysis {
  const score = scoreMiniCaseOrder(options, orderedOptionKeys, alternateOrders);
  const orders = validOrders(options, alternateOrders);
  const reference = orders[score.matchedSequence] ?? orders[0]!;

  const displayed =
    displayedOptionKeys && isPermutationOfOptions(options, displayedOptionKeys)
      ? displayedOptionKeys
      : null;

  return {
    ...score,
    positionCorrect: orderedOptionKeys.map((key, index) => reference[index] === key),
    kendallDistance: kendallDistance(orderedOptionKeys, reference),
    placements: orderedOptionKeys.map((optionKey, index) => ({
      step: index + 1,
      optionKey,
      expectedStep: reference.indexOf(optionKey) + 1,
      displayedAt: displayed ? displayed.indexOf(optionKey) + 1 : null,
    })),
    options: [...options]
      .sort((a, b) => a.correctStep - b.correctStep)
      .map((o) => ({ optionKey: o.optionKey, text: o.text, correctStep: o.correctStep })),
    ...(alternateOrders.length > 0 ? { validOrders: orders } : {}),
  };
}
