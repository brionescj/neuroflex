import { Blocks, ListOrdered } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROUTES } from "@/config/routes";

export type GameId = "color-sequence" | "mini-cases";

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
];
