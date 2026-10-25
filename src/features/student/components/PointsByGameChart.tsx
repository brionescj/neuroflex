import type { StudentScores } from "../types";
import { GAME_THEME } from "./scoreTheme";
import { ScoreCard } from "./ScoreCard";

type Props = {
  pointsByGame: StudentScores["pointsByGame"];
};

/** Cuantos puntos aporta cada juego. La barra mas larga es la de tu juego fuerte. */
export function PointsByGameChart({ pointsByGame }: Props) {
  const max = Math.max(1, ...pointsByGame.map((g) => g.points));

  return (
    <ScoreCard title="Puntos por juego" subtitle="Dónde has sumado más.">
      <ul className="flex flex-col gap-3">
        {pointsByGame.map((game) => {
          const theme = GAME_THEME[game.gameId];

          return (
            <li key={game.gameId} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-zinc-200">{theme.name}</span>
                <span className="font-semibold text-white">{game.points}</span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${theme.solid}`}
                  style={{ width: `${Math.round((game.points / max) * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </ScoreCard>
  );
}
