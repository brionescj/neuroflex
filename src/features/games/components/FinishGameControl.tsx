import { useState } from "react";

type FinishGameControlProps = {
  onConfirm: () => void;

  /** Hay un nivel a medias que no se contara si se termina ahora. */
  levelInProgress: boolean;
};

/**
 * "Terminar juego" con confirmacion: terminar no se puede deshacer (volver a
 * jugar empieza de cero), asi que un toque por error no debe bastar.
 */
export function FinishGameControl({
  onConfirm,
  levelInProgress,
}: FinishGameControlProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 px-4 text-sm font-medium text-zinc-400 hover:text-white"
      >
        Terminar juego
      </button>
    );
  }

  return (
    <div className="flex max-w-xs flex-col items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-center">
      <p className="text-sm text-zinc-300">
        ¿Quieres terminar el juego?
        {levelInProgress && " El nivel en curso no se contará."}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-11 rounded-lg bg-white px-4 text-sm font-medium text-black hover:bg-zinc-200"
        >
          Sí, terminar
        </button>

        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-11 rounded-lg border border-zinc-700 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Seguir jugando
        </button>
      </div>
    </div>
  );
}
