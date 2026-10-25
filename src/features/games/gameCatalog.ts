import { Blocks, ListOrdered, Waypoints } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROUTES } from "@/config/routes";
import type { UnlockKey } from "./services/gameAccess.service";

export type GameId = "color-sequence" | "mini-cases" | "node-connection";

export type GameCatalogEntry = {
  id: GameId;

  name: string;

  description: string;

  path: string;

  icon: LucideIcon;

  /**
   * Si el juego se desbloquea jugando otros: hasta que el servidor confirme el
   * desbloqueo se ve tenue en el menu y no abre (el servidor tambien lo exige).
   */
  unlockKey?: UnlockKey;

  /** Texto positivo que explica como desbloquearlo (solo para juegos con `unlockKey`). */
  unlockHint?: string;

  /** Clase de fondo Tailwind para la portada del juego (no hay assets de imagen en el proyecto todavia). */
  accentClassName: string;
};

export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: "color-sequence",
    name: "Seriación de colores",
    description:
      "Memoriza y repite secuencias de colores cada vez más largas.",
    path: ROUTES.STUDENT_GAME_COLOR_SEQUENCE,
    icon: Blocks,
    accentClassName: "bg-sky-500",
  },

  {
    id: "node-connection",
    name: "Conexión de nodos",
    description:
      "Une los pares de colores sin que las líneas se crucen: planifica la ruta y corrige si se bloquea.",
    path: ROUTES.STUDENT_GAME_NODE_CONNECTION,
    icon: Waypoints,
    accentClassName: "bg-emerald-500",
  },

  // Siempre el ultimo: se desbloquea jugando los dos anteriores, y al
  // aparecer debe quedar despues de ellos, no entre medio.
  {
    id: "mini-cases",
    name: "Banco de Mini Casos",
    description:
      "Resuelve casos pedagógicos bajo presión y ordena el plan de acción correcto.",
    path: ROUTES.STUDENT_GAME_MINI_CASES,
    icon: ListOrdered,
    unlockKey: "miniCases",
    unlockHint:
      "¡Ya casi! Se abre cuando llegues al nivel 10 en Seriación de colores y también en Conexión de nodos. Sigue jugando, cada nivel te acerca.",
    accentClassName: "bg-violet-500",
  },
];
