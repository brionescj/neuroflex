import { Check } from "lucide-react";

import { MINI_CASE_IMAGE_OPTIONS } from "@/config/miniCaseImages";
import { MiniCaseImage } from "@/features/games/mini-cases/images/MiniCaseImage";
import { cn } from "@/lib/utils";

type MiniCaseImagePickerProps = {
  value: string;
  onChange: (imageKey: string) => void;
  /** Prefijo de los id, por si hay mas de una galeria en pantalla. */
  idPrefix?: string;
};

/**
 * Galeria para elegir el dibujo que el juego muestra 4 segundos como distractor. Es un grupo de
 * opciones (una sola elegida): se maneja con el teclado igual que un grupo de botones de radio.
 */
export function MiniCaseImagePicker({ value, onChange, idPrefix = "imagen" }: MiniCaseImagePickerProps) {
  return (
    <div role="radiogroup" aria-label="Imagen del distractor" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {MINI_CASE_IMAGE_OPTIONS.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            id={`${idPrefix}-${option.value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-xl border bg-zinc-900 text-left transition-colors",
              selected ? "border-sky-400 ring-2 ring-sky-400/60" : "border-zinc-700 hover:border-zinc-500",
            )}
          >
            <MiniCaseImage imageKey={option.value} className="aspect-8/5 w-full" />

            <span className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs text-zinc-300">
              <span className="min-w-0 truncate">{option.label}</span>

              {selected && <Check className="size-4 shrink-0 text-sky-400" aria-hidden="true" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
