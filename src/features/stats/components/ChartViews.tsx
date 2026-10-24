import { useState } from "react";

import { cn } from "@/lib/utils";

import type { AttemptState, GameId, StudentProfile } from "../types";
import { breakdownText } from "../utils/breakdown";
import { ChartCard } from "./ChartCard";
import { EvolutionSection } from "./EvolutionSection";
import { GameSection } from "./GameSection";
import { GameStateFilter } from "./GameStateFilter";
import { ViewTabs, type ViewTab } from "./ViewTabs";

type View = "time" | "general";

const TABS: ViewTab<View>[] = [
  { id: "time", label: "Comparativa en el tiempo", hint: "Promedios por semana o por mes" },
  { id: "general", label: "Comparativa general", hint: "Todas sus partidas juntas" },
];

const ABOUT: Record<View, string> = {
  time: "Promedio de sus partidas en cada semana (de lunes a domingo) o en cada mes, juego por juego, para ver cómo ha ido cambiando.",
  general:
    "Todas sus partidas de cada juego juntas, sin dividirlas por fecha. Usa solo su propio historial: no lo compara con otros estudiantes.",
};

type ChartViewsProps = {
  rut: string;
  profile: StudentProfile;
  onChooseStates: (game: GameId, states: AttemptState[]) => void;
};

/**
 * Los gráficos del estudiante en dos pestañas: cómo cambió con el tiempo o todo junto.
 * Cada pestaña se arma la primera vez que se abre y después solo se oculta, así conserva
 * lo que el admin eligió (el tipo de lectura, los juegos abiertos).
 */
export function ChartViews({ rut, profile, onChooseStates }: ChartViewsProps) {
  const [view, setView] = useState<View>("time");
  const [visited, setVisited] = useState<ReadonlySet<View>>(new Set<View>(["time"]));

  function choose(next: View) {
    setView(next);
    setVisited((previous) => new Set([...previous, next]));
  }

  return (
    <section className="flex flex-col gap-3">
      <ViewTabs tabs={TABS} value={view} onChange={choose} />

      <p className="px-1 text-xs leading-relaxed text-zinc-400">{ABOUT[view]}</p>

      {visited.has("time") && (
        <div className={cn("flex flex-col gap-4", view !== "time" && "hidden")}>
          <EvolutionSection key={`evolucion-${rut}`} rut={rut} />
        </div>
      )}

      {visited.has("general") && (
        <div className={cn("flex flex-col gap-4", view !== "general" && "hidden")}>
          {profile.games.map((game) => (
            <GameSection
              key={game.game}
              title={game.label}
              empty={!game.played}
              summary={
                game.played
                  ? `${breakdownText(game.breakdown)} · ${game.charts.length} ${game.charts.length === 1 ? "gráfico" : "gráficos"}`
                  : "Aún no ha jugado"
              }
            >
              <GameStateFilter breakdown={game.breakdown} onChange={(next) => onChooseStates(game.game, next)} />

              {game.charts.length === 0 && (
                <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-xs text-zinc-500">
                  Con estas partidas no hay nada que graficar. Elige otras arriba.
                </p>
              )}

              {game.charts.map((chart) => (
                <ChartCard
                  key={chart.id}
                  result={chart.result}
                  description={chart.description}
                  subtitle=""
                  loading={false}
                  stale={false}
                  single
                />
              ))}
            </GameSection>
          ))}
        </div>
      )}
    </section>
  );
}
