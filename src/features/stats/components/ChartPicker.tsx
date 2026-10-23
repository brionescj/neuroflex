import { useId, useState } from "react";

import { cn } from "@/lib/utils";

import type { CatalogChart, ChartId } from "../types";
import { HelpButton, HelpNote } from "./HelpNote";

type ChartPickerProps = {
  charts: CatalogChart[];
  value: ChartId;
  onChange: (chart: ChartId) => void;
};

/**
 * Los graficos del juego, con su nombre. Cada uno lleva su «?»: la explicacion
 * se lee antes de elegirlo y no ocupa lugar mientras no se pide.
 */
export function ChartPicker({ charts, value, onChange }: ChartPickerProps) {
  const [helpFor, setHelpFor] = useState<ChartId | null>(null);
  const base = useId();

  return (
    <div role="radiogroup" aria-label="Gráfico" className="flex flex-col gap-2">
      {charts.map((chart) => {
        const selected = chart.id === value;
        const open = helpFor === chart.id;
        const helpId = `${base}-${chart.id}`;
        const label = `Qué muestra «${chart.title}»`;

        return (
          <div key={chart.id} className="flex flex-col gap-1.5">
            <div
              className={cn(
                "flex items-stretch rounded-xl border transition-colors",
                selected ? "border-white bg-zinc-800" : "border-zinc-700 hover:bg-zinc-800/60",
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(chart.id)}
                className="min-h-11 min-w-0 flex-1 px-3 py-2.5 text-left"
              >
                <span className="block text-sm font-semibold text-white">{chart.title}</span>
              </button>

              <HelpButton
                label={label}
                open={open}
                controls={helpId}
                onClick={() => setHelpFor(open ? null : chart.id)}
              />
            </div>

            {open && (
              <HelpNote id={helpId} label={label} onClose={() => setHelpFor(null)}>
                {chart.blurb}
              </HelpNote>
            )}
          </div>
        );
      })}
    </div>
  );
}
