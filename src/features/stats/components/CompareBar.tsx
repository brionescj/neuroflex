import { GitCompareArrows, ListFilter, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { activeChips, withoutChips } from "../utils/activeChips";
import type { Catalog, CatalogChart, Selection } from "../types";
import { CompareSheet } from "./CompareSheet";

type CompareBarProps = {
  catalog: Catalog;
  chart: CatalogChart;
  selection: Selection;
  /** Se entrega la seleccion nueva ya completa; quien la recibe recalcula el grafico si hay uno a la vista. */
  onApply: (next: Selection) => void;
};

/**
 * La barra que va justo encima del gráfico, donde se ve su efecto: un botón que abre la hoja para
 * comparar o acotar, y debajo, lo que está activo como chips que se quitan con su «×» (se recalcula
 * al instante). Así comparar no obliga a volver a la selección ni a desplazarse.
 */
export function CompareBar({ catalog, chart, selection, onApply }: CompareBarProps) {
  const [open, setOpen] = useState(false);
  const chips = activeChips(catalog, selection, chart);
  const Icon = chart.canCompare ? GitCompareArrows : ListFilter;
  const label = chart.canCompare ? "Comparar" : "Acotar";

  return (
    <section
      aria-label={chart.canCompare ? "Comparar este gráfico" : "Acotar este gráfico"}
      className="mb-3 flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3"
    >
      <div className="flex items-center gap-3">
        <Button variant="outline" size="md" onClick={() => setOpen(true)} className="shrink-0 gap-2">
          <Icon aria-hidden="true" className="size-4" />
          {label}
          {chips.length > 0 && (
            <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold leading-5 text-black">
              {chips.length}
            </span>
          )}
        </Button>

        {chips.length === 0 && (
          <p className="min-w-0 text-xs leading-snug text-zinc-400">
            {chart.canCompare
              ? "Compara este gráfico por universidad, género y más, o acótalo a quienes quieras."
              : "Acota la lista a quienes quieras: por universidad, paralelo, edad y más."}
          </p>
        )}
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Lo que está activo">
          {chips.map((chip) => (
            <li key={chip.id} className="flex max-w-full items-stretch rounded-full border border-zinc-600 bg-zinc-800 text-xs text-white">
              <span className="min-w-0 truncate py-1.5 pl-3 pr-1">{chip.label}</span>
              <button
                type="button"
                onClick={() => onApply(chip.clear(selection))}
                aria-label={`Quitar «${chip.label}»`}
                className="flex min-w-9 shrink-0 items-center justify-center rounded-full pr-1 text-zinc-300 hover:text-white"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}

          {chips.length > 1 && (
            <li>
              <button
                type="button"
                onClick={() => onApply(withoutChips(selection))}
                className="min-h-9 px-2 text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
              >
                Quitar todo
              </button>
            </li>
          )}
        </ul>
      )}

      {open && (
        <CompareSheet
          catalog={catalog}
          chart={chart}
          selection={selection}
          onApply={(next) => {
            setOpen(false);
            onApply(next);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}
