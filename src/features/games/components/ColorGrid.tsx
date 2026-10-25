import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { SequenceColorId } from "../hooks/colorSequenceConfig";

export type { SequenceColorId };

/**
 * Cada color tiene dos caras: apagado (oscuro, para que al encenderse el cambio se note) y encendido
 * (tono claro con resplandor, "fosforescente"). El resplandor es un box-shadow del mismo color.
 */
export const SEQUENCE_COLORS: Array<{
  id: SequenceColorId;
  label: string;
  offClassName: string;
  litClassName: string;
}> = [
  {
    id: "blue",
    label: "Azul",
    offClassName: "bg-sky-700",
    litClassName: "bg-sky-300 shadow-[0_0_36px_10px_rgba(56,189,248,0.8)]",
  },
  {
    id: "green",
    label: "Verde",
    offClassName: "bg-emerald-700",
    litClassName: "bg-emerald-300 shadow-[0_0_36px_10px_rgba(52,211,153,0.8)]",
  },
  {
    id: "orange",
    label: "Naranja",
    offClassName: "bg-amber-700",
    litClassName: "bg-amber-300 shadow-[0_0_36px_10px_rgba(251,191,36,0.8)]",
  },
  {
    id: "red",
    label: "Rojo",
    offClassName: "bg-rose-700",
    litClassName: "bg-rose-300 shadow-[0_0_36px_10px_rgba(251,113,133,0.8)]",
  },
];

/** Cuanto dura el destello al tocar un color (confirma el toque sin decir si fue acierto). */
const TAP_FLASH_MS = 220;

type ColorGridProps = {
  activeId?: SequenceColorId | null;
  disabled?: boolean;
  onSelect: (id: SequenceColorId) => void;
};

export function ColorGrid({ activeId, disabled, onSelect }: ColorGridProps) {
  const [flashId, setFlashId] = useState<SequenceColorId | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  function handleSelect(id: SequenceColorId) {
    setFlashId(id);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashId(null), TAP_FLASH_MS);

    onSelect(id);
  }

  return (
    <div
      role="group"
      aria-label="Tablero de secuencia de colores"
      className="grid aspect-square w-full grid-cols-2 grid-rows-2 gap-2 rounded-3xl border border-zinc-800 bg-zinc-950 p-2"
    >
      {SEQUENCE_COLORS.map((color) => {
        const isLit = activeId === color.id || flashId === color.id;

        return (
          <button
            key={color.id}
            type="button"
            disabled={disabled}
            onClick={() => handleSelect(color.id)}
            aria-label={`Color ${color.label}`}
            className={cn(
              "rounded-2xl transition-[background-color,box-shadow,opacity,transform] duration-150",
              isLit ? color.litClassName : color.offClassName,
              isLit ? "scale-[0.97] opacity-100" : disabled ? "opacity-70" : "opacity-90",
              disabled ? "cursor-not-allowed" : "active:scale-95",
            )}
          />
        );
      })}
    </div>
  );
}
