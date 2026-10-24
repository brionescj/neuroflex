import { cn } from "@/lib/utils";

import type { AttemptState, GameBreakdown } from "../types";
import { breakdownText } from "../utils/breakdown";

const STATES: { id: AttemptState; label: string }[] = [
  { id: "finished", label: "Terminadas" },
  { id: "failed", label: "Fallidas" },
  { id: "open", label: "Sin terminar" },
];

const countOf = (breakdown: GameBreakdown, state: AttemptState) => breakdown[state];

type GameStateFilterProps = {
  breakdown: GameBreakdown;
  onChange: (states: AttemptState[]) => void;
};

/**
 * Qué partidas de un juego entran en sus gráficos. Por defecto, todas; el admin puede
 * mirar solo algunas (por ejemplo, solo las terminadas) y los gráficos se recalculan.
 */
export function GameStateFilter({ breakdown, onChange }: GameStateFilterProps) {
  const { states, selected, withData, total } = breakdown;
  const all = states.length === STATES.length;
  const withoutData = selected - withData;

  function toggle(state: AttemptState) {
    const next = states.includes(state) ? states.filter((item) => item !== state) : [...states, state];

    // Siempre queda al menos un estado: sin ninguno no habría nada que mostrar.
    if (next.length === 0) return;

    onChange(STATES.map((item) => item.id).filter((id) => next.includes(id)));
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[var(--viz-text-2)]">
      <p className="leading-relaxed">
        <span className="font-medium text-[var(--viz-text)]">{breakdownText(breakdown)}.</span>{" "}
        {selected === 0
          ? "Con esta selección no hay partidas."
          : withoutData === 0
            ? selected === 1
              ? "En los gráficos entra 1 partida, con resultados guardados."
              : `En los gráficos entran las ${selected} ${all ? "partidas" : "partidas elegidas"}, todas con resultados guardados.`
            : `En los gráficos entran ${withData} de ${selected}: ${withoutData} ${withoutData === 1 ? "no guardó" : "no guardaron"} ningún nivel o caso y no tienen nada que graficar.`}
      </p>

      {total > 0 && (
        <div role="group" aria-label="Partidas que entran en los gráficos" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={all}
            onClick={() => onChange(STATES.map((item) => item.id))}
            className={cn(
              "min-h-11 rounded-lg border px-3 text-xs font-medium transition-colors",
              all ? "border-white bg-white text-black" : "border-white/10 hover:bg-white/5",
            )}
          >
            Todas
          </button>

          {STATES.map(({ id, label }) => {
            const on = !all && states.includes(id);

            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => (all ? onChange([id]) : toggle(id))}
                className={cn(
                  "min-h-11 rounded-lg border px-3 text-xs font-medium transition-colors",
                  on ? "border-white bg-white text-black" : "border-white/10 hover:bg-white/5",
                )}
              >
                {label} <span className="tabular-nums opacity-70">({countOf(breakdown, id)})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
