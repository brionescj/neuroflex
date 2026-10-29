import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";

/**
 * Cubre el juego cuando se abrio en otra pestana o dispositivo: aqui ya no se puede seguir (lo que se
 * jugara se guardaria dos veces), y lo ultimo guardado esta a salvo para retomarlo desde donde se abrio.
 */
export function GameLeaseLostNotice() {
  const navigate = useNavigate();

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="game-lease-lost-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
    >
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-center">
        <p id="game-lease-lost-title" className="text-lg font-semibold text-white">
          Este juego se abrió en otro lugar
        </p>

        <p className="text-sm text-zinc-300">
          Lo abriste en otra pestaña o dispositivo, así que aquí quedó en pausa para no guardar tu
          avance dos veces. Tu progreso está a salvo: puedes seguir desde donde lo abriste.
        </p>

        <Button onClick={() => navigate(ROUTES.STUDENT_GAMES, { replace: true })} className="mt-1 self-center">
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
