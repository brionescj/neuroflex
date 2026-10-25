import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** Una linea que explica que se esta viendo; queda a la vista aunque la tarjeta este cerrada. */
  subtitle?: string;
  /** Si nace abierta (por defecto, cerrada). Se puede abrir y cerrar con el titulo. */
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Una seccion de "Mis puntuaciones": el titulo (con su resumen) es un boton que
 * pliega y despliega el contenido, igual que los bloques de Estadisticas.
 */
export function ScoreCard({ title, subtitle, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-white">{title}</span>
            {subtitle && <span className="block text-sm font-normal text-zinc-400">{subtitle}</span>}
          </span>

          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
          />
        </button>
      </h2>

      <div id={bodyId} hidden={!open} className="flex flex-col gap-4 px-4 pb-4">
        {children}
      </div>
    </section>
  );
}
