import { ChevronDown } from "lucide-react";

/** Como se ganan los puntos, a mano: sin letra chica ni sorpresas. */
export function HowPointsWork() {
  return (
    <details className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
      <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-white">
        ¿Cómo se ganan los puntos?
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
      </summary>

      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5">
        <li>
          <strong className="text-white">10 puntos</strong> por cada nivel que superas en Seriación de colores
          o en Conexión de nodos.
        </li>
        <li>
          <strong className="text-white">+5</strong> si lo superas al primer intento.
        </li>
        <li>
          <strong className="text-white">+5</strong> si lo haces sin fallar: todos los colores bien, o el
          tablero sin ningún error.
        </li>
        <li>
          En Mini casos, <strong className="text-white">3 puntos</strong> por cada paso en su lugar y{" "}
          <strong className="text-white">+8</strong> si el orden queda perfecto.
        </li>
        <li>
          Cuenta tu mejor resultado en cada nivel: <strong className="text-white">tus puntos nunca bajan</strong>,
          aunque una partida salga distinta.
        </li>
      </ul>
    </details>
  );
}
