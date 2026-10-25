import type { ChartResult } from "../types";

/** El titulo de «Cómo se calculó»: con cuantos estudiantes y si se quito algo del grafico. */
export function calcSummary(result: Pick<ChartResult, "studentsTotal">, single: boolean, removed: boolean): string {
  if (single) return removed ? "Cómo se calculó (contando lo que se quitó del gráfico)" : "Cómo se calculó";

  const students = `${result.studentsTotal} ${result.studentsTotal === 1 ? "estudiante" : "estudiantes"}`;

  return `Cómo se calculó (${students}${removed ? ", contando lo que se quitó del gráfico" : ""})`;
}
