import { Check, Circle, Star } from "lucide-react";

import type { LadderLevel, ScoreGameId } from "../types";
import { GAME_THEME } from "./scoreTheme";
import { ScoreCard } from "./ScoreCard";

type Props = {
  gameId: Extract<ScoreGameId, "color-sequence" | "node-connection">;
  ladder: LadderLevel[];
  bestLevel: number;
};

function describe(level: LadderLevel): string {
  switch (level.state) {
    case "first-try":
      return `Nivel ${level.level}: superado a la primera, ${level.points} puntos`;
    case "retry":
      return `Nivel ${level.level}: superado, ${level.points} puntos`;
    case "reached":
      return `Nivel ${level.level}: llegaste, todavía no lo superas`;
    default:
      return `Nivel ${level.level}: aún no llegas`;
  }
}

/**
 * La escalera de niveles de un juego. Cada nivel superado se ilumina; el estado se distingue por
 * el icono y el relleno, no solo por el color. Lo que falta se ve como camino por recorrer.
 */
export function LevelLadder({ gameId, ladder, bestLevel }: Props) {
  const theme = GAME_THEME[gameId];

  return (
    <ScoreCard
      title={theme.name}
      subtitle={
        bestLevel > 0
          ? `Tu mejor nivel superado: ${bestLevel}.`
          : "Aquí se iluminará cada nivel que superes."
      }
    >
      <ol className="grid grid-cols-5 gap-2">
        {ladder.map((level) => {
          const base =
            "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm font-semibold";

          const tone =
            level.state === "first-try"
              ? `${theme.solid} ${theme.border} text-zinc-950`
              : level.state === "retry"
                ? `${theme.soft} ${theme.border} text-white`
                : level.state === "reached"
                  ? "border-zinc-500 bg-zinc-800 text-zinc-200"
                  : "border-dashed border-zinc-800 text-zinc-600";

          return (
            <li key={level.level} className={`${base} ${tone}`} aria-label={describe(level)}>
              <span aria-hidden="true">{level.level}</span>

              <span aria-hidden="true" className="absolute right-1 top-1">
                {level.state === "first-try" && <Star className="size-3 fill-current" />}
                {level.state === "retry" && <Check className="size-3" />}
                {level.state === "reached" && <Circle className="size-2.5" />}
              </span>
            </li>
          );
        })}
      </ol>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        <li className="flex items-center gap-1.5">
          <Star aria-hidden="true" className={`size-3 fill-current ${theme.text}`} />
          A la primera
        </li>
        <li className="flex items-center gap-1.5">
          <Check aria-hidden="true" className={`size-3 ${theme.text}`} />
          Superado
        </li>
        <li className="flex items-center gap-1.5">
          <Circle aria-hidden="true" className="size-2.5 text-zinc-400" />
          Llegaste
        </li>
      </ul>
    </ScoreCard>
  );
}
