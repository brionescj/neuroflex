import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionProps = {
  step: number;
  title: string;
  /** Lo elegido, visible aunque la seccion este cerrada. */
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/**
 * Un bloque de la seleccion. Nace plegado en cualquier pantalla: su titulo y lo
 * elegido siguen a la vista y la flecha lo abre.
 */
export function Section({ step, title, summary, open, onToggle, children }: SectionProps) {
  const id = `stats-section-${step}`;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300"
          >
            {step}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">{title}</span>
            <span className="block truncate text-xs text-zinc-400">{summary}</span>
          </span>

          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
          />
        </button>
      </h2>

      <div id={id} className={cn("px-4 pb-4", open ? "block" : "hidden")}>
        {children}
      </div>
    </section>
  );
}
