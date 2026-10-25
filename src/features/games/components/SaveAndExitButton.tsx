import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

type SaveAndExitButtonProps = {
  /** Espera a que el avance llegue al servidor. true si quedo guardado. */
  onSave: () => Promise<boolean>;

  className?: string;

  /** Lo que se guarda: un nivel (Seriacion y Nodos) o un caso (Mini casos). */
  unit?: "nivel" | "caso";
};

type State = "idle" | "confirm" | "saving" | "error";

/**
 * "Guardar nivel y salir": deja guardado el nivel en que va y lleva al inicio. Es lo mismo que pasa
 * si se cierra el navegador, pero a proposito y con la certeza de que quedo guardado: ante una
 * emergencia siempre hay una salida. Al volver se retoma ese nivel desde su inicio.
 *
 * Pide confirmacion antes de salir: un toque sin querer cerca del tablero no debe sacar al estudiante
 * del juego. La opcion que preselecciona (y a la que lleva Esc) es seguir jugando.
 */
export function SaveAndExitButton({ onSave, className, unit = "nivel" }: SaveAndExitButtonProps) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<State>("idle");

  // El cuadro nativo se abre y se cierra segun el estado: asi el navegador se encarga del foco y de Esc.
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (state === "idle") {
      if (dialog.open) dialog.close();
    } else if (!dialog.open) {
      dialog.showModal();
    }
  }, [state]);

  async function handleConfirm() {
    if (state === "saving") return;

    setState("saving");

    const saved = await onSave();

    if (saved) {
      navigate(ROUTES.STUDENT);
      return;
    }

    setState("error");
  }

  function keepPlaying() {
    if (state !== "saving") setState("idle");
  }

  const saving = state === "saving";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => setState("confirm")}
        className="min-h-11 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
      >
        Guardar {unit} y salir
      </button>

      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          keepPlaying();
        }}
        aria-labelledby="save-exit-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-white backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p id="save-exit-title" className="text-lg font-semibold">
              ¿Guardar tu {unit} y salir?
            </p>

            <p className="text-sm text-zinc-300">
              Tu avance queda guardado y vuelves al inicio. Cuando regreses, retomas este {unit} desde su comienzo.
            </p>
          </div>

          {state === "error" && (
            <p role="alert" className="text-sm text-amber-300">
              No pudimos guardar tu avance (revisa tu conexión). Intenta de nuevo para no perder el nivel.
            </p>
          )}

          <div className="flex flex-col gap-2 min-[360px]:flex-row-reverse">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="min-h-11 flex-1 rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "Guardando..." : state === "error" ? "Intentar de nuevo" : "Sí, guardar y salir"}
            </button>

            <button
              type="button"
              onClick={keepPlaying}
              disabled={saving}
              autoFocus
              className="min-h-11 flex-1 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              Seguir jugando
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
