import { Pencil } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { AVATARS, type AvatarId } from "@/config/avatars";
import { cn } from "@/lib/utils";

/** Como se nombra cada avatar al leerlo en voz alta (los ids son los del catalogo). */
const AVATAR_NAMES: Record<AvatarId, string> = {
  cat: "Gato",
  dog: "Perro",
  fish: "Pez",
  rabbit: "Conejo",
  turtle: "Tortuga",
  panda: "Panda",
};

type AvatarPickerProps = {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  /** Solo se puede cambiar mientras la tarjeta esta en edicion; fuera de ella es un dibujo. */
  editing: boolean;
};

/**
 * El avatar dentro de la tarjeta del perfil. Mientras se edita, al tocarlo se despliegan los avatares disponibles;
 * al elegir uno se cierra. Escape o tocar fuera tambien lo cierran.
 */
export function AvatarPicker({ value, onChange, editing }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const isOpen = open && editing;

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  if (!editing) {
    return <Avatar avatarId={value} size="lg" role="img" aria-label={`Avatar: ${AVATAR_NAMES[value]}`} />;
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Cambiar avatar (ahora: ${AVATAR_NAMES[value]})`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="relative block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Avatar avatarId={value} size="lg" />

        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border border-zinc-950 bg-white text-black"
        >
          <Pencil className="size-3" />
        </span>
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="group"
          aria-label="Avatares disponibles"
          className="absolute left-0 top-full z-20 mt-2 grid w-max grid-cols-3 gap-2 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl"
        >
          {(Object.entries(AVATARS) as [AvatarId, (typeof AVATARS)[AvatarId]][]).map(([id, { icon: Icon, color }]) => (
            <button
              key={id}
              type="button"
              aria-label={AVATAR_NAMES[id]}
              aria-pressed={value === id}
              onClick={() => {
                onChange(id);
                setOpen(false);
              }}
              className={cn(
                "flex size-12 items-center justify-center rounded-full text-white transition",
                color,
                value === id ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : "opacity-60 hover:opacity-100",
              )}
            >
              <Icon className="size-5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
