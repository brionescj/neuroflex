import { Link } from "react-router-dom";

import { ROUTES } from "@/config/routes";

import { seriesColor } from "../../utils/colors";
import { formatNumber, formatValue } from "../../utils/format";
import { consideredHeader, hasParts, totalHeader, valueIsCount } from "../../utils/reading";
import type { ChartResult } from "../../types";
import { showsCounts, useSingleStudent } from "./singleStudent";

/** Donde se ve el desempeño de un estudiante, abierto desde su RUT. */
function profileLink(rut: string) {
  return `${ROUTES.ADMIN_STUDENT_STATS}?rut=${encodeURIComponent(rut)}`;
}

/** Una tabla de filas (listas de estudiantes, indicadores por grupo): se desplaza si no cabe. */
export function RowsTable({
  caption,
  columns,
  rows,
  emptyText = "No hay filas para mostrar con estos filtros.",
}: {
  caption: string;
  columns: string[];
  rows: (string | number | null)[][];
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-white/10 px-3 py-6 text-center text-xs text-[var(--viz-muted)]">{emptyText}</p>
    );
  }

  return (
    <div className="max-h-[28rem] max-w-full overflow-auto rounded-lg border border-white/10">
      <table className="w-full min-w-max border-collapse text-left text-xs text-[var(--viz-text-2)]">
        <caption className="sr-only">{caption}</caption>

        <thead className="sticky top-0 bg-[var(--viz-surface)]">
          <tr className="border-b border-white/10 text-[var(--viz-muted)]">
            {columns.map((column) => (
              <th key={column} scope="col" className="px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b border-white/5 last:border-0">
              {row.map((value, c) => (
                <td
                  key={c}
                  className={
                    c === 0
                      ? "px-3 py-1.5 font-normal text-[var(--viz-text)]"
                      : "px-3 py-1.5 tabular-nums"
                  }
                >
                  {columns[c] === "RUT" && typeof value === "string" && value !== "" ? (
                    <Link
                      to={profileLink(value)}
                      aria-label={`Ver el desempeño de ${value}`}
                      className="underline decoration-white/30 underline-offset-2 hover:decoration-white"
                    >
                      {value}
                    </Link>
                  ) : value === null || value === "" ? (
                    "—"
                  ) : typeof value === "number" ? (
                    formatNumber(value)
                  ) : (
                    value
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tabla propia de listas y resumenes (estudiantes sin partidas, indicadores por grupo). */
function OwnTable({ result }: { result: ChartResult }) {
  const table = result.table as NonNullable<ChartResult["table"]>;

  return <RowsTable caption={result.title} columns={table.columns} rows={table.rows} />;
}

/** La version en tabla de cualquier grafico: todos los valores, sin pasar el cursor. */
export function ChartTable({ result }: { result: ChartResult }) {
  const single = useSingleStudent();
  const counts = showsCounts(result, single) && !valueIsCount(result);
  const parted = hasParts(result);
  const alone = result.series.length === 1 && result.series[0]?.key === "all";

  if (result.table) return <OwnTable result={result} />;

  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-full overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-max border-collapse text-left text-xs text-[var(--viz-text-2)]">
          <caption className="sr-only">
            {result.title}: valores por {result.xLabel.toLowerCase()}
          </caption>

          <thead>
            <tr className="border-b border-white/10 text-[var(--viz-muted)]">
              <th scope="col" className="sticky left-0 bg-[var(--viz-surface)] px-3 py-2 font-medium">
                {result.xLabel}
              </th>

              {result.series.map((series) => (
                <th key={series.key} scope="col" className="px-3 py-2 text-right font-medium">
                  {/* Con un solo grupo («Todos los estudiantes») su nombre no aporta: solo enreda la lectura. */}
                  {!alone && (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="inline-block size-2 rounded-sm"
                        style={{ background: seriesColor(series.slot) }}
                      />
                      {series.label}
                    </span>
                  )}
                  {result.yLabel !== "" && <span className="block font-normal">{result.yLabel}</span>}
                  {!single && (
                    <span className="block font-normal">
                      Total de estudiantes: {formatNumber(series.n)}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {result.categories.map((category, i) => (
              <tr key={category + i} className="border-b border-white/5 last:border-0">
                <th
                  scope="row"
                  className="sticky left-0 bg-[var(--viz-surface)] px-3 py-1.5 font-normal text-[var(--viz-text)]"
                >
                  {category}
                </th>

                {result.series.map((series) => {
                  const value = series.values[i] ?? null;

                  return (
                    <td key={series.key} className="px-3 py-1.5 text-right tabular-nums">
                      <span className="text-[var(--viz-text)]">
                        {value === null ? "—" : formatValue(value, result.unit)}
                      </span>
                      {counts && (
                        <span className="ml-1.5 text-[var(--viz-muted)]">
                          {parted && result.unit === "percent"
                            ? `(${formatNumber(series.part?.[i] ?? 0)} de ${formatNumber(series.total?.[i] ?? 0)})`
                            : `(${formatNumber(parted ? (series.total?.[i] ?? 0) : (series.ns[i] ?? 0))})`}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {counts && (
        <p className="text-[11px] leading-snug text-[var(--viz-muted)]">
          {parted && result.unit === "percent"
            ? `Entre paréntesis, cuántos de cuántos hay detrás de cada porcentaje: ${totalHeader(result).toLowerCase()}.`
            : parted
              ? `Entre paréntesis: ${totalHeader(result).toLowerCase()}.`
              : `Entre paréntesis, ${consideredHeader(result).toLowerCase()} (con cuántos se calculó cada valor).`}
        </p>
      )}
    </div>
  );
}
