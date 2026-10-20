import { Blocks, ListOrdered, Waypoints } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROUTES } from "@/config/routes";

export type GameId = "color-sequence" | "mini-cases" | "node-connection";

export type GameCatalogEntry = {
  id: GameId;

  name: string;

  description: string;

  path: string;

  icon: LucideIcon;

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
    id: "mini-cases",
    name: "Banco de Mini Casos",
    description:
      "Resuelve casos pedagógicos bajo presión y ordena el plan de acción correcto.",
    path: ROUTES.STUDENT_GAME_MINI_CASES,
    icon: ListOrdered,
    accentClassName: "bg-violet-500",
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
];
