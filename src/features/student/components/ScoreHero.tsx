import { Sparkles, Trophy } from "lucide-react";

import type { Badge, StudentScores } from "../types";

type Props = {
  scores: StudentScores;
};

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800"
    >
      <div
        className="h-full rounded-full bg-amber-300 transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function NextGoal({ goal }: { goal: Badge }) {
  const percent = Math.round((goal.current / goal.goal) * 100);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
        <Sparkles aria-hidden="true" className="size-4 text-amber-300" />
        Tu próxima meta
      </p>

      <p className="text-sm text-white">
        <span className="font-semibold">{goal.name}</span>
        <span className="text-zinc-400"> · {goal.description}</span>
      </p>

      <div className="flex items-center gap-3">
        <ProgressBar percent={percent} label={`Avance hacia ${goal.name}`} />
        <span className="shrink-0 text-xs text-zinc-300">
          {goal.current} de {goal.goal}
        </span>
      </div>
    </div>
  );
}

/** Rango, puntos totales y lo que falta para el siguiente rango: lo primero que ve el estudiante. */
export function ScoreHero({ scores }: Props) {
  const { rank, totalPoints, nextGoal } = scores;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-300/10 via-zinc-900/60 to-zinc-900/60 p-4">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-amber-300 text-zinc-950"
        >
          <Trophy className="size-7" />
        </span>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Tu rango</p>
          <p className="truncate text-2xl font-bold text-white">{rank.name}</p>
          <p className="text-sm text-amber-200">
            <span className="font-semibold">{totalPoints}</span>{" "}
            {totalPoints === 1 ? "punto" : "puntos"}
          </p>
        </div>
      </div>

      {rank.next ? (
        <div className="flex flex-col gap-1.5">
          <ProgressBar percent={rank.progressPercent} label={`Avance hacia el rango ${rank.next.name}`} />

          <p className="text-sm text-zinc-300">
            {totalPoints === 0
              ? `Pasa tu primer nivel y empieza a sumar. El siguiente rango es ${rank.next.name}.`
              : `Te faltan ${rank.pointsToNext} ${rank.pointsToNext === 1 ? "punto" : "puntos"} para ser ${rank.next.name}.`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-amber-200">¡Llegaste al rango más alto! Sigue mejorando tus marcas.</p>
      )}

      {nextGoal && <NextGoal goal={nextGoal} />}
    </section>
  );
}
