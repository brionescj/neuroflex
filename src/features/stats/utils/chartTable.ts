import type { ChartResult } from "../types";

export type TableCell = string | number | null;

export type ChartTableData = { columns: string[]; rows: TableCell[][] };

/**
 * La tabla de un grafico tal como se descarga en Excel: los mismos valores que muestra la
 * vista «Tabla». Los numeros quedan como numeros (no como texto) para poder calcular con ellos.
 */
export function chartTable(result: ChartResult, options: { single?: boolean } = {}): ChartTableData {
  if (result.table) return { columns: result.table.columns, rows: result.table.rows };

  // Con un solo estudiante el total de «estudiantes» siempre es 1: solo sirve en los repartos.
  const withCounts = !options.single || (result.views.includes("stacked") && result.unit === "percent");

  const columns = [
    result.xLabel,
    ...result.series.flatMap((series) => [
      `${series.label} (${result.yLabel})`,
      ...(withCounts ? [`${series.label} (total de ${result.unitLabel})`] : []),
    ]),
  ];

  const rows = result.categories.map((category, i) => [
    category,
    ...result.series.flatMap((series) => [series.values[i] ?? null, ...(withCounts ? [series.ns[i] ?? 0] : [])]),
  ]);

  return { columns, rows };
}

/** El dia (del reloj de quien descarga) como AAAA-MM-DD, para los nombres de archivo. */
export function chartDay(now: Date = new Date()): string {
  const two = (value: number) => String(value).padStart(2, "0");

  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

/** «neuroflex-cs-time-2026-10-21»: el grafico y el dia, sin la extension. */
export function exportFileName(result: ChartResult, now: Date = new Date()): string {
  return `neuroflex-${result.chart}-${chartDay(now)}`;
}

/** El nombre de la hoja de Excel: maximo 31 caracteres y sin \ / ? * [ ] : */
export function sheetName(title: string): string {
  const clean = title.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim();

  return (clean === "" ? "Datos" : clean).slice(0, 31);
}
