import { CircleHelp, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Donde se usa: en la tarjeta del grafico (colores de las graficas) o en los controles (oscuro). */
export type HelpTone = "viz" | "dark";

const TEXT: Record<HelpTone, string> = {
  viz: "text-[var(--viz-text-2)]",
  dark: "text-zinc-400",
};

const STRONG: Record<HelpTone, string> = {
  viz: "text-[var(--viz-text)]",
  dark: "text-white",
};

type HelpButtonProps = {
  /** Que explica: «Qué muestra «Nivel máximo superado»». */
  label: string;
  open: boolean;
  /** Id del cuadro que abre. */
  controls: string;
  onClick: () => void;
  tone?: HelpTone;
  className?: string;
};

/** El icono «?»: abre y cierra la explicacion. Mide 44 px para que se pueda tocar. */
export function HelpButton({ label, open, controls, onClick, tone = "dark", className }: HelpButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      title="Qué muestra este gráfico"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/5",
        TEXT[tone],
        className,
      )}
    >
      <CircleHelp aria-hidden="true" className={cn("size-5", open && STRONG[tone])} />
    </button>
  );
}

type HelpNoteProps = {
  id: string;
  label: string;
  onClose: () => void;
  tone?: HelpTone;
  className?: string;
  children: ReactNode;
};

/** El cuadro con la explicacion, con su boton para cerrarlo (tambien con Escape). */
export function HelpNote({ id, label, onClose, tone = "dark", className, children }: HelpNoteProps) {
  return (
    <div
      id={id}
      role="region"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className={cn(
        "flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 py-1 pl-3 pr-1 text-xs leading-relaxed",
        TEXT[tone],
        className,
      )}
    >
      <p className="min-w-0 flex-1 py-2">{children}</p>

      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar descripción"
        className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/5", TEXT[tone])}
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
