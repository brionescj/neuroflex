import { formatNumber } from "./format";
import type { ChartResult } from "../types";

/**
 * CSV de un grafico, pensado para abrirlo con Excel en espanol: separador ";",
 * decimales con coma y BOM para que respete las tildes y la n.
 */
const SEPARATOR = ";";

/** Un texto que empieza con = + - @ lo ejecutaria Excel como formula. */
function safeText(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function cell(text: string): string {
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function numberCell(value: number | null): string {
  return value === null ? "" : formatNumber(value).replace(/\./g, "");
}

export function chartToCsv(result: ChartResult): string {
  if (result.table) {
    const lines = [result.table.columns, ...result.table.rows.map((row) => row.map((v) => (typeof v === "number" ? numberCell(v) : (v ?? ""))))].map((row) =>
      row.map((text) => cell(safeText(String(text)))).join(SEPARATOR),
    );

    return `\uFEFF${lines.join("\r\n")}\r\n`;
  }

  const header = [
    result.xLabel,
    ...result.series.flatMap((series) => [
      `${series.label} (${result.yLabel})`,
      `${series.label} (total de ${result.unitLabel})`,
    ]),
  ];

  const rows = result.categories.map((category, i) => [
    category,
    ...result.series.flatMap((series) => [
      numberCell(series.values[i] ?? null),
      String(series.ns[i] ?? 0),
    ]),
  ]);

  const lines = [header, ...rows].map((row) =>
    row.map((text) => cell(safeText(text))).join(SEPARATOR),
  );

  return `﻿${lines.join("\r\n")}\r\n`;
}

export function csvFileName(result: ChartResult, now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);

  return `neuroflex-${result.chart}-${day}.csv`;
}
