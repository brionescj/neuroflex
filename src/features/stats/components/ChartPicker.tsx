import { cn } from "@/lib/utils";

import type { CatalogChart, ChartId } from "../types";

type ChartPickerProps = {
  charts: CatalogChart[];
  value: ChartId;
  onChange: (chart: ChartId) => void;
};

/** Cada grafico con su explicacion en palabras simples, siempre a la vista. */
export function ChartPicker({ charts, value, onChange }: ChartPickerProps) {
  return (
    <div role="radiogroup" aria-label="Gráfico" className="flex flex-col gap-2">
      {charts.map((chart) => {
        const selected = chart.id === value;

        return (
          <button
            key={chart.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(chart.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              selected ? "border-white bg-zinc-800" : "border-zinc-700 hover:bg-zinc-800/60",
            )}
          >
            <span className="block text-sm font-semibold text-white">{chart.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{chart.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}
