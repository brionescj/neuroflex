import { Trophy } from "lucide-react";

import type { AttemptBar, ScoreGameId } from "../types";
import { GAME_THEME } from "./scoreTheme";
import { ScoreCard } from "./ScoreCard";

type Props = {
  gameId: Extract<ScoreGameId, "color-sequence" | "node-connection">;
  attempts: AttemptBar[];
};

const PLOT_HEIGHT = 112;

/**
 * Hasta donde llegaste en cada partida. Una partida con marca nueva lleva copa: es la forma de ver
 * que cada vez llegas mas lejos, sin comparar con nadie.
 */
export function AttemptsChart({ gameId, attempts }: Props) {
  const theme = GAME_THEME[gameId];
  const max = Math.max(5, ...attempts.map((a) => a.bestLevel));
  const records = attempts.filter((a) => a.isRecord).length;

  return (
    <ScoreCard
      title={`Tus partidas: ${theme.name}`}
      subtitle={
        records > 0
          ? `Superaste tu marca ${records === 1 ? "1 vez" : `${records} veces`}.`
          : "Mejor nivel superado en cada partida."
      }
    >
      <ol className="flex items-end gap-1.5" style={{ height: PLOT_HEIGHT + 40 }}>
        {attempts.map((attempt) => {
          const height = Math.round((attempt.bestLevel / max) * PLOT_HEIGHT);

          return (
            <li
              key={attempt.attemptNumber}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              aria-label={`Partida ${attempt.attemptNumber}: nivel ${attempt.bestLevel}${attempt.isRecord ? ", marca nueva" : ""}`}
            >
              <span className="flex h-4 items-center text-xs font-semibold text-white" aria-hidden="true">
                {attempt.isRecord && <Trophy className="mr-0.5 size-3 text-amber-300" />}
                {attempt.bestLevel}
              </span>

              <span
                aria-hidden="true"
                className={`w-full rounded-t-md ${attempt.isRecord ? "bg-amber-300" : theme.solid}`}
                style={{ height: Math.max(attempt.bestLevel > 0 ? 4 : 2, height) }}
              />

              <span className="text-[11px] text-zinc-400" aria-hidden="true">
                P{attempt.attemptNumber}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-zinc-500">P = partida. La copa marca las veces que llegaste más lejos que antes.</p>
    </ScoreCard>
  );
}
