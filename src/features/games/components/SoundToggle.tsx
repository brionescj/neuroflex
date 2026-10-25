import { Volume2, VolumeX } from "lucide-react";

import { setSoundMuted, unlockSound, useSoundMuted } from "@/lib/gameSound";

/** Silenciar o activar los sonidos del juego. */
export function SoundToggle() {
  const muted = useSoundMuted();

  return (
    <button
      type="button"
      onClick={() => {
        unlockSound();
        setSoundMuted(!muted);
      }}
      aria-pressed={muted}
      aria-label={muted ? "Activar sonido" : "Silenciar sonido"}
      title={muted ? "Activar sonido" : "Silenciar sonido"}
      className="inline-flex size-11 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
    >
      {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
    </button>
  );
}
