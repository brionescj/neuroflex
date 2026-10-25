import type { NodeMargin } from "../types";
import { GAME_THEME } from "./scoreTheme";
import { ScoreCard } from "./ScoreCard";

type Props = {
  margins: NodeMargin[];
};

/** Del margen de errores que tenias, cuanto te sobro en cada nivel superado: 100% es un tablero impecable. */
export function NodeMarginChart({ margins }: Props) {
  const theme = GAME_THEME["node-connection"];
  const sorted = [...margins].sort((a, b) => a.level - b.level);
  const clean = sorted.filter((m) => m.marginPercent === 100).length;

  return (
    <ScoreCard
      title="Margen que te sobró en Conexión de nodos"
      subtitle={
        clean > 0
          ? `${clean === 1 ? "1 nivel" : `${clean} niveles`} sin ningún error. 100% es un tablero impecable.`
          : "Cuanto más largo, más margen de errores te sobró."
      }
    >
      <ul className="flex flex-col gap-2">
        {sorted.map((margin) => (
          <li key={margin.level} className="flex items-center gap-3 text-sm">
            <span className="w-14 shrink-0 text-zinc-300">Nivel {margin.level}</span>

            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
              <div
                className={`h-full rounded-full ${theme.solid}`}
                style={{ width: `${margin.marginPercent}%` }}
              />
            </div>

            <span className="w-10 shrink-0 text-right font-semibold text-white">
              {margin.marginPercent}%
            </span>
          </li>
        ))}
      </ul>
    </ScoreCard>
  );
}
