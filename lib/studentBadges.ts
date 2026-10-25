/**
 * Insignias del estudiante. Se calculan SIEMPRE desde los resultados guardados
 * (no se "entregan" ni se guardan aparte): asi nunca hay una insignia que el
 * estudiante tenga y los datos no respalden, ni una que se pierda por un error.
 *
 * Cada insignia tiene un nivel de dificultad (1 a 5) y la lista va de menor a
 * mayor: las primeras se logran en la primera sesion y las ultimas piden mucha
 * practica, precision y constancia. Ninguna depende del tiempo.
 */

export type BadgeTier = 1 | 2 | 3 | 4 | 5;

export const TIER_NAMES: Record<BadgeTier, string> = {
  1: "Primeros pasos",
  2: "Constancia",
  3: "Dominio",
  4: "Experto",
  5: "Maestría",
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  goal: number;
  /** Avance hacia la meta, nunca mayor que `goal`. */
  current: number;
  earned: boolean;
};

/** Lo que se sabe del estudiante, ya contado, para decidir sus insignias. */
export type BadgeFacts = {
  totalPoints: number;
  levelsPassed: number;
  firstTryLevels: number;
  flawlessSeriation: number;
  flawlessNodes: number;
  /** Niveles de nodos superados conservando mas de la mitad del margen de errores. */
  wideMarginNodes: number;
  seriationBest: number;
  nodesBest: number;
  gamesPlayed: number;
  finishedAttempts: number;
  comebacks: number;
  records: number;
  /** Partidas de 10 o mas niveles superados todos al primer intento. */
  flawlessRuns: number;
  /** Dias distintos (hora de Chile) en que jugo. */
  daysPlayed: number;
  perfectCases: number;
  playedCases: number;
  /** Casos que tiene el banco (0 si no se conoce). */
  totalCases: number;
};

type BadgeDef = {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  goal: (facts: BadgeFacts) => number;
  value: (facts: BadgeFacts) => number;
};

const fixed = (n: number) => () => n;

/** Mismo largo que el banco; con el banco vacio o desconocido la meta es 1 para no dar la insignia gratis. */
const bankSize = (facts: BadgeFacts) => Math.max(1, facts.totalCases);

/** Insignias que se ganan por las demas (no cuentan a si mismas ni a las otras de su tipo). */
export const COLLECTOR_IDS = ["collector-14", "collector-20"] as const;

const DEFS: BadgeDef[] = [
  // ---------------------------------------------------------------- Nivel 1: primeros pasos
  { id: "first-step", name: "Primer paso", description: "Pasa tu primer nivel en cualquier juego.", tier: 1, goal: fixed(1), value: (f) => f.levelsPassed },
  { id: "all-games", name: "Probaste todo", description: "Juega los tres juegos al menos una vez.", tier: 1, goal: fixed(3), value: (f) => f.gamesPlayed },
  { id: "memory-5", name: "Memoria 5", description: "Pasa el nivel 5 de Seriación de colores.", tier: 1, goal: fixed(5), value: (f) => f.seriationBest },
  { id: "route-5", name: "Ruta 5", description: "Pasa el nivel 5 de Conexión de nodos.", tier: 1, goal: fixed(5), value: (f) => f.nodesBest },
  { id: "steady", name: "Constancia", description: "Completa 3 partidas.", tier: 1, goal: fixed(3), value: (f) => f.finishedAttempts },
  { id: "points-100", name: "Cien puntos", description: "Suma 100 puntos.", tier: 1, goal: fixed(100), value: (f) => f.totalPoints },

  // ---------------------------------------------------------------- Nivel 2: constancia
  { id: "memory-10", name: "Memoria 10", description: "Pasa el nivel 10 de Seriación de colores.", tier: 2, goal: fixed(10), value: (f) => f.seriationBest },
  { id: "route-10", name: "Ruta 10", description: "Pasa el nivel 10 de Conexión de nodos.", tier: 2, goal: fixed(10), value: (f) => f.nodesBest },
  { id: "perfect-memory", name: "Memoria perfecta", description: "Acierta todos los colores en 6 niveles.", tier: 2, goal: fixed(6), value: (f) => f.flawlessSeriation },
  { id: "clean-board", name: "Tablero limpio", description: "Resuelve 5 niveles de nodos sin ningún error.", tier: 2, goal: fixed(5), value: (f) => f.flawlessNodes },
  { id: "days-2", name: "Volviste", description: "Juega en 2 días distintos.", tier: 2, goal: fixed(2), value: (f) => f.daysPlayed },
  { id: "comeback", name: "Insistir da frutos", description: "Pasa 3 niveles que antes no te habían salido.", tier: 2, goal: fixed(3), value: (f) => f.comebacks },
  { id: "ordered-mind", name: "Mente ordenada", description: "Ordena bien 5 mini casos por completo.", tier: 2, goal: fixed(5), value: (f) => f.perfectCases },
  { id: "new-record", name: "Superaste tu marca", description: "Llega más lejos que en tus partidas anteriores.", tier: 2, goal: fixed(1), value: (f) => f.records },
  { id: "cases-explorer", name: "Explorador de casos", description: "Responde todos los mini casos del banco al menos una vez.", tier: 2, goal: bankSize, value: (f) => f.playedCases },
  
  // ---------------------------------------------------------------- Nivel 3: dominio
  { id: "memory-15", name: "Memoria 15", description: "Pasa el nivel 15 de Seriación de colores.", tier: 3, goal: fixed(15), value: (f) => f.seriationBest },
  { id: "days-5", name: "Una semana de práctica", description: "Juega en 5 días distintos.", tier: 3, goal: fixed(5), value: (f) => f.daysPlayed },
  { id: "clean-board-12", name: "Maestro del tablero", description: "Resuelve 12 niveles de nodos sin ningún error.", tier: 3, goal: fixed(12), value: (f) => f.flawlessNodes },
  { id: "steady-5", name: "Constancia firme", description: "Completa 5 partidas.", tier: 3, goal: fixed(5), value: (f) => f.finishedAttempts },
  { id: "points-400", name: "400 puntos", description: "Suma 400 puntos.", tier: 3, goal: fixed(400), value: (f) => f.totalPoints },
  { id: "flawless-run", name: "Partida impecable", description: "Termina una partida de 10 o más niveles superando todos a la primera.", tier: 3, goal: fixed(1), value: (f) => f.flawlessRuns },
  { id: "margin-gold", name: "Margen de oro", description: "Supera 12 niveles de nodos conservando más de la mitad de tu margen de errores.", tier: 3, goal: fixed(12), value: (f) => f.wideMarginNodes },

  { id: "collector-14", name: "Coleccionista", description: "Consigue 14 insignias.", tier: 3, goal: fixed(14), value: () => 0 },

  // ---------------------------------------------------------------- Nivel 4: experto
  { id: "route-15", name: "Maestría de rutas", description: "Pasa los 15 niveles de Conexión de nodos.", tier: 4, goal: fixed(15), value: (f) => f.nodesBest },
  { id: "perfect-cases-10", name: "Estratega", description: "Ordena perfecto 10 mini casos.", tier: 4, goal: fixed(10), value: (f) => f.perfectCases },
  { id: "perfect-memory-14", name: "Memoria impecable", description: "Acierta todos los colores en 14 niveles.", tier: 4, goal: fixed(14), value: (f) => f.flawlessSeriation },
  { id: "comeback-10", name: "Imparable", description: "Pasa 10 niveles que antes no te habían salido.", tier: 4, goal: fixed(10), value: (f) => f.comebacks },
  { id: "records-3", name: "Rompe marcas", description: "Supera tu marca anterior 3 veces.", tier: 4, goal: fixed(3), value: (f) => f.records },
  { id: "points-700", name: "700 puntos", description: "Suma 700 puntos.", tier: 4, goal: fixed(700), value: (f) => f.totalPoints },
  { id: "collector-20", name: "Gran coleccionista", description: "Consigue 20 insignias.", tier: 4, goal: fixed(20), value: () => 0 },

  // ---------------------------------------------------------------- Nivel 5: maestría
  { id: "memory-20", name: "Memoria 20", description: "Pasa el nivel 20 de Seriación de colores.", tier: 5, goal: fixed(20), value: (f) => f.seriationBest },
  { id: "flawless-runs-3", name: "Tres partidas impecables", description: "Termina 3 partidas de 10 o más niveles superando todos a la primera.", tier: 5, goal: fixed(3), value: (f) => f.flawlessRuns },
  { id: "full-bank-perfect", name: "Banco perfecto", description: "Ordena perfecto todos los mini casos del banco.", tier: 5, goal: bankSize, value: (f) => f.perfectCases },
  { id: "points-900", name: "Leyenda: 900 puntos", description: "Suma 900 puntos.", tier: 5, goal: fixed(900), value: (f) => f.totalPoints },
];

export const BADGE_COUNT = DEFS.length;

function make(def: BadgeDef, facts: BadgeFacts, value: number): Badge {
  const goal = def.goal(facts);
  const current = Math.min(goal, Math.max(0, value));

  return { id: def.id, name: def.name, description: def.description, tier: def.tier, goal, current, earned: current >= goal };
}

/**
 * Todas las insignias, de la mas facil a la mas dificil (a igual nivel, en el orden
 * de la lista). Las de coleccionista cuentan las demas ya ganadas.
 */
export function buildBadges(facts: BadgeFacts): Badge[] {
  const regular = DEFS.filter((def) => !COLLECTOR_IDS.includes(def.id as (typeof COLLECTOR_IDS)[number]));
  const built = new Map<string, Badge>(regular.map((def) => [def.id, make(def, facts, def.value(facts))]));
  const earnedCount = [...built.values()].filter((badge) => badge.earned).length;

  for (const def of DEFS) {
    if (!built.has(def.id)) built.set(def.id, make(def, facts, earnedCount));
  }

  return DEFS.map((def) => built.get(def.id) as Badge).sort((a, b) => a.tier - b.tier);
}
