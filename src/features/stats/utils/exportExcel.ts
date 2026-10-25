import type { ChartResult } from "../types";
import { cardListSheets } from "./cardLists";
import { chartTable, exportFileName, sheetName, type TableCell } from "./chartTable";
import { saveBlob } from "./download";

const cell = (value: TableCell) => (value === null || value === "" ? null : value);

function sheetOf(name: string, columns: string[], rows: TableCell[][]) {
  const data = [columns.map((value) => ({ value, fontWeight: "bold" as const })), ...rows.map((row) => row.map(cell))];
  const widths = columns.map((column, c) =>
    Math.min(40, Math.max(10, column.length + 2, ...rows.map((row) => String(row[c] ?? "").length + 2))),
  );

  return { data, sheet: name, columns: widths.map((width) => ({ width })), stickyRowsCount: 1 };
}

/**
 * El Excel de un grafico: su tabla, con numeros reales y la primera fila fija. Si el grafico es un
 * resumen con listas de estudiantes (ranking de logros, quienes no han jugado…), cada lista va en
 * su propia hoja para poder filtrarla y ordenarla.
 */
export async function downloadExcel(result: ChartResult, single: boolean): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/universal");
  const { columns, rows } = chartTable(result, { single });
  const lists = result.cards ? cardListSheets(result.cards) : [];
  const main = sheetOf(sheetName(result.title), columns, rows);

  const blob =
    lists.length === 0
      ? await writeXlsxFile(main.data, {
          sheet: main.sheet,
          columns: main.columns,
          stickyRowsCount: main.stickyRowsCount,
        }).toBlob()
      : await writeXlsxFile([
          main,
          ...lists.map((list) => sheetOf(list.title, list.columns, list.rows)),
        ]).toBlob();

  saveBlob(blob, `${exportFileName(result)}.xlsx`);
}
