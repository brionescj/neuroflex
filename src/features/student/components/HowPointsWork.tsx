import { ScoreCard } from "./ScoreCard";

/** Como se ganan los puntos y las insignias, a mano: sin letra chica ni sorpresas. */
export function HowPointsWork() {
  return (
    <ScoreCard title="¿Cómo se ganan los puntos?" defaultOpen={false}>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-zinc-300">
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
          <strong className="text-white">+8</strong> si el orden queda perfecto. Un caso sin jugar no suma ni resta.
        </li>
        <li>
          Cuenta tu mejor resultado en cada nivel: <strong className="text-white">tus puntos nunca bajan</strong>,
          aunque una partida salga distinta.
        </li>
        <li>
          Las insignias van por niveles, de «Primeros pasos» a «Maestría»: cada nivel pide más práctica y
          precisión que el anterior.
        </li>
      </ul>
    </ScoreCard>
  );
}
