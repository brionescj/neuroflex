import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onToggle: () => void;
  /** Que explica el icono, p. ej. «Ver todos los rangos». */
  label: string;
  /** Id del panel que abre, para lectores de pantalla. */
  controls: string;
};

/**
 * Un icono de interrogacion que abre y cierra una ayuda en la misma pantalla. El area tactil es de
 * 44 px (cabe en 360 px) y lo que significa lo dice su etiqueta, no solo el dibujo.
 */
export function HelpToggle({ open, onToggle, label, controls }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      className={cn(
        "-m-2 grid size-11 shrink-0 place-items-center rounded-full text-zinc-400 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300",
        open && "text-amber-300",
      )}
    >
      <HelpCircle aria-hidden="true" className="size-5" />
    </button>
  );
}
