import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { HelpButton, HelpNote } from "./HelpNote";

type SectionProps = {
  step: number;
  title: string;
  /** Lo elegido, visible aunque la seccion este cerrada. */
  summary: string;
  open: boolean;
  onToggle: () => void;
  /** Explicacion de lo elegido, con su «?» en la cabecera: se lee sin abrir la seccion. */
  help?: { label: string; text: string };
  children: ReactNode;
};

/**
 * Un bloque de la seleccion. Nace plegado en cualquier pantalla: su titulo y lo
 * elegido siguen a la vista y la flecha lo abre.
 */
export function Section({ step, title, summary, open, onToggle, help, children }: SectionProps) {
  const id = `stats-section-${step}`;
  const helpId = useId();
  // Se abre para un texto: al cambiar lo elegido, la explicacion nueva nace cerrada.
  const [helpFor, setHelpFor] = useState<string | null>(null);
  const helpOpen = help !== undefined && helpFor === help.text;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="relative">
        <h2>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={id}
            className={cn("flex w-full items-center gap-3 py-3 pl-4 text-left", help ? "pr-[5.5rem]" : "pr-11")}
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

          </button>
        </h2>

        {/* La flecha va siempre al extremo derecho; el «?», si lo hay, queda entre el título y ella. */}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400 transition-transform",
            open && "rotate-180",
          )}
        />

        {help && (
          <HelpButton
            label={help.label}
            open={helpOpen}
            controls={helpId}
            onClick={() => setHelpFor(helpOpen ? null : help.text)}
            className="absolute right-10 top-1/2 -translate-y-1/2"
          />
        )}
      </div>

      {help && helpOpen && (
        <HelpNote
          id={helpId}
          label={help.label}
          onClose={() => setHelpFor(null)}
          className="mx-4 mb-3"
        >
          {help.text}
        </HelpNote>
      )}

      <div id={id} className={cn("px-4 pb-4", open ? "block" : "hidden")}>
        {children}
      </div>
    </section>
  );
}
