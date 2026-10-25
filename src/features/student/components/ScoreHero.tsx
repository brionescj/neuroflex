import { Sparkles, Trophy } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

import type { Badge, StudentScores } from "../types";
import { HelpToggle } from "./HelpToggle";
import { HowPointsWork } from "./HowPointsWork";

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

/** «Tu proxima meta» y, tras su interrogacion, como se ganan los puntos. */
function NextGoal({ goal }: { goal: Badge | null }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();
  const percent = goal ? Math.round((goal.current / goal.goal) * 100) : 100;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
          <Sparkles aria-hidden="true" className="size-4 text-amber-300" />
          Tu próxima meta
        </p>

        <HelpToggle
          open={helpOpen}
          onToggle={() => setHelpOpen((value) => !value)}
          label="Cómo se ganan los puntos"
          controls={helpId}
        />
      </div>

      <div id={helpId} hidden={!helpOpen} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
        <HowPointsWork />
      </div>

      {goal ? (
        <>
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
        </>
      ) : (
        <p className="text-sm text-amber-200">¡Lograste todas las insignias!</p>
      )}
    </div>
  );
}

/** La escalera de rangos: de cual se parte, cuanto pide cada uno y en cual estas. */
function RankLadder({ scores, id }: { scores: StudentScores; id: string }) {
  return (
    <div id={id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <p className="mb-2 text-sm font-semibold text-white">Los rangos</p>

      <ol className="flex flex-col gap-1.5">
        {scores.ranks.map((rank) => {
          const current = rank.name === scores.rank.name;

          return (
            <li
              key={rank.name}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm",
                current ? "bg-amber-300/15 text-white ring-1 ring-amber-300/50" : "text-zinc-300",
              )}
            >
              <span className="min-w-0 font-medium">
                {rank.name}
                {current && <span className="block text-xs font-normal text-amber-200">Estás aquí</span>}
              </span>
              <span className="shrink-0 text-xs text-zinc-400">
                {rank.minPoints === 0 ? "desde el inicio" : `desde ${rank.minPoints} puntos`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Rango, puntos totales y lo que falta para el siguiente rango: lo primero que ve el estudiante. */
export function ScoreHero({ scores }: Props) {
  const { rank, totalPoints, nextGoal } = scores;
  const [ranksOpen, setRanksOpen] = useState(false);
  const ranksId = useId();

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-300/10 via-zinc-900/60 to-zinc-900/60 p-4">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-amber-300 text-zinc-950"
        >
          <Trophy className="size-7" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Tu rango</p>
          <p className="truncate text-2xl font-bold text-white">{rank.name}</p>
          <p className="text-sm text-amber-200">
            <span className="font-semibold">{totalPoints}</span>{" "}
            {totalPoints === 1 ? "punto" : "puntos"}
          </p>
        </div>

        <HelpToggle
          open={ranksOpen}
          onToggle={() => setRanksOpen((value) => !value)}
          label="Ver todos los rangos"
          controls={ranksId}
        />
      </div>

      <div hidden={!ranksOpen}>
        <RankLadder scores={scores} id={ranksId} />
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

      <NextGoal goal={nextGoal} />
    </section>
  );
}
