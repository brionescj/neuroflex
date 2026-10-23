import { cn } from "@/lib/utils";

import { seriesColor } from "../../utils/colors";
import { formatNumber } from "../../utils/format";
import { groupsOf } from "../../utils/groups";
import type { ChartResult, ViewId } from "../../types";

type GroupLegendProps = {
  /** El resultado completo: los grupos ocultos siguen en la lista para poder volver a ponerlos. */
  result: ChartResult;
  /** Forma de ver el grafico, o «table». */
  view: ViewId | "table";
  hidden: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onShowAll: () => void;
};

/**
 * Los grupos que se comparan, siempre presentes con dos o mas. Cada uno es un
 * boton: tocarlo lo quita del grafico y volver a tocarlo lo pone de nuevo. Con
 * un solo grupo no hace falta (el titulo ya dice que se mira).
 */
export function GroupLegend({ result, view, hidden, onToggle, onShowAll }: GroupLegendProps) {
  const groups = groupsOf(result);

  if (groups.length < 2) return null;

  // En torta y apiladas el color es de cada categoria, no del grupo.
  const showSwatch = view !== "pie" && view !== "stacked";
  const visibleCount = groups.filter((group) => !hidden.has(group.key)).length;

  return (
    <div className="flex flex-col gap-1.5">
      <ul className="grid grid-cols-2 gap-1.5 text-xs text-[var(--viz-text-2)] sm:flex sm:flex-wrap" aria-label="Grupos comparados">
        {groups.map((group) => {
          const isHidden = hidden.has(group.key);
          const series = result.series.find((item) => item.key === group.key);
          // El ultimo grupo visible no se puede quitar.
          const locked = !isHidden && visibleCount <= 1;

          return (
            <li key={group.key} className="min-w-0">
              <button
                type="button"
                aria-pressed={!isHidden}
                aria-disabled={locked || undefined}
                onClick={() => onToggle(group.key)}
                title={isHidden ? "Volver a mostrar este grupo" : locked ? "Tiene que quedar al menos un grupo" : "Quitar este grupo del gráfico"}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-lg border px-2.5 py-1 text-left transition-colors",
                  isHidden
                    ? "border-dashed border-white/15 text-[var(--viz-muted)] hover:bg-white/5"
                    : "border-white/10 hover:bg-white/5",
                  locked && "cursor-not-allowed",
                )}
              >
                {showSwatch &&
                  (view === "lines" ? (
                    <span
                      aria-hidden="true"
                      className="inline-block w-4 shrink-0 rounded-full"
                      style={{ background: isHidden ? "var(--viz-muted)" : seriesColor(group.slot), height: 3 }}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="inline-block size-2.5 shrink-0 rounded-sm"
                      style={{ background: isHidden ? "var(--viz-muted)" : seriesColor(group.slot) }}
                    />
                  ))}

                <span className="min-w-0">
                  <span className={cn("block break-words leading-snug", isHidden && "line-through")}>{group.label}</span>

                  {series && (
                    <span className="block text-[11px] leading-snug text-[var(--viz-muted)]">
                      {/* El numero va pegado a la palabra anterior: si hay que partir la linea, no queda suelto. */}
                      Total de estudiantes:&nbsp;{formatNumber(series.n)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="flex flex-wrap items-center gap-x-3 text-[11px] leading-snug text-[var(--viz-muted)]">
        <span>Toca un grupo para quitarlo del gráfico o volver a ponerlo.</span>

        {hidden.size > 0 && (
          <button
            type="button"
            onClick={onShowAll}
            className="underline underline-offset-2 hover:text-[var(--viz-text-2)]"
          >
            Mostrar todos
          </button>
        )}
      </p>
    </div>
  );
}
