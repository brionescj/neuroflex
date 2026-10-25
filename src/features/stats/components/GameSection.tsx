import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type GameSectionProps = {
  title: string;
  /** Lo que hay dentro, visible aunque la sección esté cerrada («14 partidas · 6 gráficos»). */
  summary: string;
  /** Sin partidas no hay nada que abrir. */
  empty?: boolean;
  /**
   * Al plegar, lo de adentro se oculta pero sigue armado: al volver a abrir aparece al instante,
   * con lo que ya había cargado. Sin esto, se arma de nuevo cada vez que se abre.
   */
  keepMounted?: boolean;
  children: ReactNode;
};

/** Los gráficos de un juego, plegados: el admin abre solo los que le interesan. */
export function GameSection({ title, summary, empty = false, keepMounted = false, children }: GameSectionProps) {
  const [open, setOpen] = useState(false);
  // Con «keepMounted», desde la primera vez que se abre queda armado.
  const [everOpened, setEverOpened] = useState(false);
  const id = useId();

  return (
    <section aria-label={title} className="rounded-2xl border border-zinc-800 bg-zinc-900">
      <h2>
        <button
          type="button"
          onClick={() => {
            if (!open) setEverOpened(true);
            setOpen(!open);
          }}
          aria-expanded={empty ? undefined : open}
          aria-controls={empty ? undefined : id}
          disabled={empty}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-white">{title}</span>
            <span className="block text-xs text-zinc-400">{summary}</span>
          </span>

          {!empty && (
            <ChevronDown
              aria-hidden="true"
              className={cn("size-5 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
            />
          )}
        </button>
      </h2>

      {(open || (keepMounted && everOpened)) && !empty && (
        <div id={id} className={cn("flex flex-col gap-3 border-t border-zinc-800 p-3 sm:p-4", !open && "hidden")}>
          {children}
        </div>
      )}
    </section>
  );
}
