import { seriesColor } from "../../utils/colors";
import { formatNumber, formatValue } from "../../utils/format";
import type { ChartResult } from "../../types";

type ChartTooltipProps = {
  result: ChartResult;
  /** Categoria sobre la que se esta. */
  index: number;
  /** Posicion del ancla dentro del contenedor, en px. */
  x: number;
  y: number;
  containerWidth: number;
};

const WIDTH = 224;

/**
 * Un solo tooltip con todas las series de la categoria. El valor va primero y
 * destacado; el nombre de la serie, atras. Los textos entran como texto de
 * React (nunca como HTML): vienen de datos de estudiantes.
 */
export function ChartTooltip({ result, index, x, y, containerWidth }: ChartTooltipProps) {
  const left = Math.min(
    Math.max(x, WIDTH / 2 + 4),
    Math.max(containerWidth - WIDTH / 2 - 4, WIDTH / 2 + 4),
  );

  // En actividad y abandono el valor ya es la cantidad: un "n" igual lo repetiria.
  const showN = result.chart !== "activity" && result.chart !== "abandonment";

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-[#262625] px-3 py-2 text-xs shadow-xl"
      style={{ left, top: y, width: WIDTH, transform: "translate(-50%, calc(-100% - 8px))" }}
    >
      <p className="mb-1 font-medium text-[var(--viz-text-2)]">
        {result.categories[index]}
      </p>

      <ul className="space-y-1">
        {result.series.map((series) => {
          const value = series.values[index] ?? null;

          return (
            <li key={series.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-3 shrink-0 rounded-full"
                style={{ background: seriesColor(series.slot), height: 3 }}
              />

              <span className="font-semibold text-[var(--viz-text)]">
                {value === null ? "Sin datos" : formatValue(value, result.unit)}
              </span>

              <span className="min-w-0 flex-1 truncate text-[var(--viz-muted)]">
                {result.series.length > 1 ? series.label : ""}
              </span>

              {showN && (
                <span className="shrink-0 text-[var(--viz-muted)]">
                  n = {formatNumber(series.ns[index] ?? 0)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
