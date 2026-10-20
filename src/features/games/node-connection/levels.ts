import { parseLevel } from "./levelParser";
import type { NodeLevel } from "./types";

/**
 * Los 15 tableros del entrenamiento, de menor a mayor dificultad: crece el
 * tamano (de 4x4 a 8x8), el numero de pares (de 2 a 8) y, con ello, la
 * densidad de conexiones. El enunciado no fija con cuantos pares se empieza;
 * se parte con 2.
 *
 * Cada tablero se escribe como texto (ver parseLevel): '.' es una celda vacia
 * y cada letra marca un nodo, dos por color. Todos tienen solucion (lo
 * comprueba levels.test.ts con un solucionador). Desde el nivel 4 se descarto
 * cualquier tablero que se resolviera uniendo los pares por su camino mas
 * corto (con un desempate fijo) en cualquier orden, y entre los restantes se
 * eligio uno que, al probar caminos cortos al azar, se resuelve cada vez menos
 * (aprox. 25 % de los intentos en el nivel 4, 2 % en el 10 y menos de 1 % desde
 * el 12): hay que anticipar las rutas, que es lo que se entrena. Es una
 * medida aproximada de dificultad; conviene ajustarla con alumnos reales.
 *
 * Si se edita un tablero, el avance guardado de un alumno que lo tenia a
 * medias deja de ser valido y se descarta.
 */
const LEVEL_LAYOUTS: string[][] = [
  // Nivel 1: 4x4, 2 pares
  [
    "..BR",
    "....",
    "...R",
    ".B..",
  ],

  // Nivel 2: 4x4, 3 pares
  [
    "B...",
    ".RB.",
    ".Y..",
    "..RY",
  ],

  // Nivel 3: 5x5, 3 pares
  [
    "B...Y",
    ".....",
    "...B.",
    "..R..",
    "R...Y",
  ],

  // Nivel 4: 5x5, 4 pares
  [
    "...Y.",
    ".G.RY",
    ".....",
    ".R..G",
    "B...B",
  ],

  // Nivel 5: 5x5, 5 pares
  [
    ".RG.G",
    ".Y.O.",
    ".....",
    "B..Y.",
    ".BRO.",
  ],

  // Nivel 6: 6x6, 5 pares
  [
    "R...YO",
    ".GR...",
    "..BY..",
    "......",
    "...G..",
    "B....O",
  ],

  // Nivel 7: 6x6, 6 pares
  [
    "..OY.Y",
    "...BPR",
    "O.B...",
    "....R.",
    ".G....",
    "....GP",
  ],

  // Nivel 8: 7x7, 6 pares
  [
    "..B....",
    ".....R.",
    ".G.....",
    ".YRBO.P",
    "G......",
    ".....P.",
    ".Y..O..",
  ],

  // Nivel 9: 7x7, 7 pares
  [
    ".Y....R",
    ".R....Y",
    "....G..",
    ".....P.",
    "PCB..B.",
    "..O....",
    ".C..O.G",
  ],

  // Nivel 10: 7x7, 7 pares
  [
    "C.....P",
    "......Y",
    ".OPBR..",
    "C.G....",
    "G......",
    ".O..BY.",
    "......R",
  ],

  // Nivel 11: 7x7, 7 pares
  [
    "OC..CB.",
    ".......",
    ".R.OR..",
    ".....P.",
    "P....YB",
    "Y....G.",
    "G......",
  ],

  // Nivel 12: 8x8, 7 pares
  [
    "B.....CP",
    "....C...",
    "R.......",
    ".B.R....",
    ".......Y",
    "G.......",
    ".P.G.O..",
    "...Y...O",
  ],

  // Nivel 13: 8x8, 8 pares
  [
    "O......R",
    "..B.....",
    "...C..R.",
    "...O...Y",
    ".W......",
    "....CG..",
    ".....W..",
    ".BP..PGY",
  ],

  // Nivel 14: 8x8, 8 pares
  [
    "G..CW..R",
    "......B.",
    "...R....",
    "....W..Y",
    "....C...",
    "..GOYB.P",
    "........",
    ".O..P...",
  ],

  // Nivel 15: 8x8, 8 pares
  [
    ".B.W..GC",
    ".W.YG.O.",
    "........",
    "..O..C.R",
    "........",
    "BR..Y..P",
    "........",
    ".P......",
  ],
];

export const LEVELS: NodeLevel[] = LEVEL_LAYOUTS.map((layout, index) =>
  parseLevel(index + 1, layout),
);

export const TOTAL_LEVELS = LEVELS.length;

export function getLevel(levelNumber: number): NodeLevel {
  const level = LEVELS[levelNumber - 1];

  if (!level) {
    throw new Error(`No existe el nivel ${levelNumber}.`);
  }

  return level;
}
