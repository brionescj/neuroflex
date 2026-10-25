import { createContext, useContext } from "react";

import type { ChartResult } from "../../types";

/**
 * Verdadero cuando el gráfico habla de un solo estudiante (la sección «Desempeño»).
 * Ahí «Total de estudiantes: 1» o «(1)» no dicen nada: siempre es uno.
 */
export const SingleStudentContext = createContext(false);

export function useSingleStudent(): boolean {
  return useContext(SingleStudentContext);
}

/**
 * Si el número entre paréntesis (o «Total de…») aporta algo. Con un grupo siempre; con un
 * solo estudiante solo en los repartos (qué parte de un total), donde es la cantidad real de
 * niveles, errores o partidas detrás del porcentaje, y en la evolución en el tiempo, donde dice
 * con cuántas partidas se calculó el promedio de cada semana o mes.
 */
export function showsCounts(result: ChartResult, single: boolean): boolean {
  return !single || result.chart.startsWith("ev-") || (result.views.includes("stacked") && result.unit === "percent");
}
