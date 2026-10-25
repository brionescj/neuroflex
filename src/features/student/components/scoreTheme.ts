import type { ScoreGameId } from "../types";

/** Colores por juego (los mismos de las portadas del menu). Clases completas para que Tailwind las encuentre. */
export const GAME_THEME: Record<
  ScoreGameId,
  { name: string; solid: string; soft: string; border: string; text: string }
> = {
  "color-sequence": {
    name: "Seriación de colores",
    solid: "bg-sky-400",
    soft: "bg-sky-400/20",
    border: "border-sky-400",
    text: "text-sky-300",
  },
  "node-connection": {
    name: "Conexión de nodos",
    solid: "bg-emerald-400",
    soft: "bg-emerald-400/20",
    border: "border-emerald-400",
    text: "text-emerald-300",
  },
  "mini-cases": {
    name: "Mini casos",
    solid: "bg-violet-400",
    soft: "bg-violet-400/20",
    border: "border-violet-400",
    text: "text-violet-300",
  },
};
