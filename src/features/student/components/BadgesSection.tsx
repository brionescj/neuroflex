import { Award, Lock } from "lucide-react";

import type { Badge, BadgeTier } from "../types";
import { ScoreCard } from "./ScoreCard";

type Props = {
  badges: Badge[];
};

const TIER_NAMES: Record<BadgeTier, string> = {
  1: "Primeros pasos",
  2: "Constancia",
  3: "Dominio",
  4: "Experto",
  5: "Maestría",
};

const TIERS: BadgeTier[] = [1, 2, 3, 4, 5];

function BadgeCard({ badge }: { badge: Badge }) {
  const percent = Math.round((badge.current / badge.goal) * 100);

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border p-3 ${
        badge.earned ? "border-amber-300/50 bg-amber-300/10" : "border-zinc-800 bg-zinc-950/40"
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className={`grid size-8 shrink-0 place-items-center rounded-full ${
            badge.earned ? "bg-amber-300 text-zinc-950" : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {badge.earned ? <Award className="size-4" /> : <Lock className="size-4" />}
        </span>

        <div className="min-w-0">
          <p className={`text-sm font-semibold ${badge.earned ? "text-white" : "text-zinc-300"}`}>
            {badge.name}
            {badge.earned && <span className="sr-only"> (lograda)</span>}
          </p>
          <p className="text-xs text-zinc-400">{badge.description}</p>
        </div>
      </div>

      {!badge.earned && (
        <div className="flex items-center gap-2">
          <div
            role="progressbar"
            aria-label={`Avance de ${badge.name}`}
            aria-valuemin={0}
            aria-valuemax={badge.goal}
            aria-valuenow={badge.current}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800"
          >
            <div className="h-full rounded-full bg-amber-300/70" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-xs text-zinc-400">
            {badge.current}/{badge.goal}
          </span>
        </div>
      )}
    </li>
  );
}

/**
 * Insignias por nivel de dificultad, de las primeras a las de maestría. Las logradas
 * brillan; las demas muestran cuanto llevas, no lo que te falta.
 */
export function BadgesSection({ badges }: Props) {
  const earned = badges.filter((b) => b.earned).length;

  return (
    <ScoreCard title="Insignias" subtitle={`Llevas ${earned} de ${badges.length}.`}>
      {TIERS.map((tier) => {
        const group = badges.filter((b) => b.tier === tier);

        if (group.length === 0) return null;

        const done = group.filter((b) => b.earned).length;

        return (
          <div key={tier} className="flex flex-col gap-2">
            <h3 className="flex items-baseline justify-between gap-2 text-sm font-semibold text-white">
              <span>
                Nivel {tier} · {TIER_NAMES[tier]}
              </span>
              <span className="text-xs font-normal text-zinc-400">
                {done} de {group.length}
              </span>
            </h3>

            <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
              {group.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </ul>
          </div>
        );
      })}
    </ScoreCard>
  );
}
