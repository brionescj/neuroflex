import type { ChartResult } from "../types";
import { chartTable, exportFileName, sheetName, type TableCell } from "./chartTable";
import { saveBlob } from "./download";

/** El Excel de un grafico: solo su tabla, con numeros reales y la primera fila fija. */
export async function downloadExcel(result: ChartResult, single: boolean): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/universal");
  const { columns, rows } = chartTable(result, { single });

  const cell = (value: TableCell) => (value === null || value === "" ? null : value);
  const data = [
    columns.map((value) => ({ value, fontWeight: "bold" as const })),
    ...rows.map((row) => row.map(cell)),
  ];
  const widths = columns.map((column, c) =>
    Math.min(40, Math.max(10, column.length + 2, ...rows.map((row) => String(row[c] ?? "").length + 2))),
  );

  const blob = await writeXlsxFile(data, {
    sheet: sheetName(result.title),
    columns: widths.map((width) => ({ width })),
    stickyRowsCount: 1,
  }).toBlob();

  saveBlob(blob, `${exportFileName(result)}.xlsx`);
}
