import type { StudentScores } from "../types";
import { ScoreCard } from "./ScoreCard";

type Props = {
  stats: StudentScores["stats"];
};

/** Tres cifras que solo suben: niveles superados, a la primera y partidas completadas. */
export function StatTiles({ stats }: Props) {
  const tiles = [
    { value: stats.levelsPassed, label: "niveles superados" },
    { value: stats.firstTryLevels, label: "a la primera" },
    { value: stats.finishedAttempts, label: "partidas completadas" },
  ];

  return (
    <ScoreCard title="Tu resumen" subtitle="Cifras que solo suben." defaultOpen>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col items-center gap-0.5 rounded-xl border border-zinc-800 bg-zinc-950/40 px-2 py-3 text-center"
          >
            <span className="text-2xl font-bold text-white">{tile.value}</span>
            <span className="text-xs leading-tight text-zinc-400">{tile.label}</span>
          </div>
        ))}
      </div>
    </ScoreCard>
  );
}
