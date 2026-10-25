import type { CaseBar } from "../types";
import { GAME_THEME } from "./scoreTheme";
import { ScoreCard } from "./ScoreCard";

type Props = {
  cases: CaseBar[];
  played: number;
  total: number;
};

const STEPS = [1, 2, 3, 4];

/**
 * Pasos que pusiste en su lugar en cada caso del banco (tu mejor resultado). Los cuatro llenos son
 * un orden perfecto; un caso sin jugar sale como pendiente, nunca como un resultado.
 */
export function CaseStepsChart({ cases, played, total }: Props) {
  const theme = GAME_THEME["mini-cases"];
  const perfect = cases.filter((c) => c.complete).length;

  return (
    <ScoreCard
      title="Mini casos"
      subtitle={`Respondiste ${played} de ${total} casos${perfect > 0 ? ` · ${perfect} con el orden perfecto` : ""}.`}
    >
      <ul className="flex flex-col gap-2">
        {cases.map((item, index) => (
          <li
            key={item.caseKey}
            className="flex items-center gap-3 text-sm"
            aria-label={
              item.played
                ? `Caso ${index + 1}: ${item.steps} de 4 pasos en su lugar${item.complete ? ", orden perfecto" : ""}`
                : `Caso ${index + 1}: todavía sin jugar`
            }
          >
            <span className={`w-14 shrink-0 ${item.played ? "text-zinc-300" : "text-zinc-500"}`}>Caso {index + 1}</span>

            <div className="flex flex-1 gap-1" aria-hidden="true">
              {STEPS.map((step) => (
                <span
                  key={step}
                  className={`h-2.5 flex-1 rounded-full ${
                    item.played && step <= item.steps ? theme.solid : item.played ? "bg-zinc-800" : "border border-dashed border-zinc-800"
                  }`}
                />
              ))}
            </div>

            <span className={`w-14 shrink-0 text-right ${item.played ? "font-semibold text-white" : "text-xs text-zinc-500"}`}>
              {item.played ? `${item.steps}/4` : "Sin jugar"}
            </span>
          </li>
        ))}
      </ul>
    </ScoreCard>
  );
}
