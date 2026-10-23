import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

import { seriesColor } from "../utils/colors";
import type { ChartResult } from "../types";

type CategoryFilterProps = {
  /** El resultado completo: las partes quitadas siguen en la lista para poder volver a ponerlas. */
  result: ChartResult;
  /** Con color propio por parte (torta y apiladas). */
  colored: boolean;
  hidden: ReadonlySet<number>;
  onToggle: (index: number) => void;
  onShowAll: () => void;
};

/**
 * «Qué partes mostrar»: cada parte del grafico (un nivel, una porcion) es un
 * boton que se quita y se vuelve a poner. Plegado por defecto para ahorrar
 * espacio; su resumen dice cuantas partes se ven.
 */
export function CategoryFilter({ result, colored, hidden, onToggle, onShowAll }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const total = result.categories.length;
  const visible = total - hidden.size;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 text-left text-xs text-[var(--viz-text-2)] hover:bg-white/5"
      >
        <span>
          Elegir qué partes mostrar{" "}
          <span className="text-[var(--viz-muted)]">
            ({visible} de {total})
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id={panelId} className="flex flex-col gap-1.5">
          <ul
            aria-label="Partes del gráfico"
            className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1 text-xs text-[var(--viz-text-2)]"
          >
            {result.categories.map((category, index) => {
              const isHidden = hidden.has(index);
              const locked = !isHidden && visible <= 1;

              return (
                <li key={category + index}>
                  <button
                    type="button"
                    aria-pressed={!isHidden}
                    aria-disabled={locked || undefined}
                    onClick={() => onToggle(index)}
                    title={
                      isHidden ? "Volver a mostrar esta parte" : locked ? "Tiene que quedar al menos una parte" : "Quitar esta parte del gráfico"
                    }
                    className={cn(
                      "flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 transition-colors",
                      isHidden
                        ? "border-dashed border-white/15 text-[var(--viz-muted)] line-through hover:bg-white/5"
                        : "border-white/10 hover:bg-white/5",
                      locked && "cursor-not-allowed",
                    )}
                  >
                    {colored && (
                      <span
                        aria-hidden="true"
                        className="inline-block size-2.5 shrink-0 rounded-sm"
                        style={{ background: isHidden ? "var(--viz-muted)" : seriesColor(result.categorySlots?.[index] ?? index) }}
                      />
                    )}
                    {category}
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="flex flex-wrap items-center gap-x-3 text-[11px] leading-snug text-[var(--viz-muted)]">
            <span>Toca una parte para quitarla del gráfico o volver a ponerla.</span>

            {hidden.size > 0 && (
              <button type="button" onClick={onShowAll} className="underline underline-offset-2 hover:text-[var(--viz-text-2)]">
                Mostrar todas
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
