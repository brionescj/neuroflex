import type { CaseBar } from "../types";
import { GAME_THEME } from "./scoreTheme";
import { ScoreCard } from "./ScoreCard";

type Props = {
  cases: CaseBar[];
};

const STEPS = [1, 2, 3, 4];

/** Pasos que pusiste en su lugar en cada caso (tu mejor resultado). Los cuatro llenos son un orden perfecto. */
export function CaseStepsChart({ cases }: Props) {
  const theme = GAME_THEME["mini-cases"];
  const perfect = cases.filter((c) => c.complete).length;

  return (
    <ScoreCard
      title="Mini casos"
      subtitle={
        perfect > 0
          ? `${perfect === 1 ? "1 caso" : `${perfect} casos`} con el orden perfecto.`
          : "Pasos que pusiste en su lugar en cada caso."
      }
    >
      <ul className="flex flex-col gap-2">
        {cases.map((item, index) => (
          <li
            key={item.caseKey}
            className="flex items-center gap-3 text-sm"
            aria-label={`Caso ${index + 1}: ${item.steps} de 4 pasos en su lugar${item.complete ? ", orden perfecto" : ""}`}
          >
            <span className="w-14 shrink-0 text-zinc-300">Caso {index + 1}</span>

            <div className="flex flex-1 gap-1" aria-hidden="true">
              {STEPS.map((step) => (
                <span
                  key={step}
                  className={`h-2.5 flex-1 rounded-full ${step <= item.steps ? theme.solid : "bg-zinc-800"}`}
                />
              ))}
            </div>

            <span className="w-10 shrink-0 text-right font-semibold text-white">{item.steps}/4</span>
          </li>
        ))}
      </ul>
    </ScoreCard>
  );
}
