import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

type SaveAndExitButtonProps = {
  /** Espera a que el avance llegue al servidor. true si quedo guardado. */
  onSave: () => Promise<boolean>;

  className?: string;
};

/**
 * "Guardar nivel y salir": deja guardado el nivel en que va y lleva al inicio. Es lo mismo que pasa
 * si se cierra el navegador, pero a proposito y con la certeza de que quedo guardado: ante una
 * emergencia siempre hay una salida. Al volver se retoma ese nivel desde su inicio.
 */
export function SaveAndExitButton({ onSave, className }: SaveAndExitButtonProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function handleClick() {
    if (state === "saving") return;

    setState("saving");

    const saved = await onSave();

    if (saved) {
      navigate(ROUTES.STUDENT);
      return;
    }

    setState("error");
  }

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "saving"}
        className="min-h-11 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
      >
        {state === "saving" ? "Guardando..." : "Guardar nivel y salir"}
      </button>

      {state === "error" && (
        <p role="alert" className="max-w-xs text-center text-xs text-amber-300">
          No pudimos guardar tu avance (revisa tu conexión). Intenta de nuevo para no perder el nivel.
        </p>
      )}
    </div>
  );
}
