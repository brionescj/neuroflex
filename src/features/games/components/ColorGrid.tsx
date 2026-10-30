import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { SEQUENCE_COLORS } from "../hooks/colorSequenceColors";
import type { SequenceColorId } from "../hooks/colorSequenceConfig";

export type { SequenceColorId };

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
