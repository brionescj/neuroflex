import { seriesColor } from "../../utils/colors";
import { readPoint } from "../../utils/reading";
import type { ChartResult } from "../../types";
import { showsCounts, useSingleStudent } from "./singleStudent";

type ChartTooltipProps = {
  result: ChartResult;
  /** Categoria sobre la que se esta. */
  index: number;
  /** Posicion del ancla dentro del contenedor, en px. */
  x: number;
  y: number;
  containerWidth: number;
};

const WIDTH = 272;

/**
 * Un solo tooltip con todas las series de la categoria. Cada dato lleva su nombre
 * («Nivel: 14», «% que lo superó: 75,9 %») y, debajo, cuántos de cuántos hay detrás
 * («22 estudiantes de un total de 29»). Los textos entran como texto de React
 * (nunca como HTML): vienen de datos de estudiantes.
 */
export function ChartTooltip({ result, index, x, y, containerWidth }: ChartTooltipProps) {
  const left = Math.min(
    Math.max(x, WIDTH / 2 + 4),
    Math.max(containerWidth - WIDTH / 2 - 4, WIDTH / 2 + 4),
  );

  const single = useSingleStudent();
  const counts = showsCounts(result, single);
  const first = result.series[0];
  const heading = first ? readPoint(result, first, index, counts).x : { label: "", value: "" };

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-[#262625] px-3 py-2 text-xs shadow-xl"
      style={{ left, top: y, width: WIDTH, transform: "translate(-50%, calc(-100% - 8px))" }}
    >
      <p className="mb-1 font-medium text-[var(--viz-text-2)]">
        {heading.label !== "" ? `${heading.label}: ` : ""}
        {heading.value}
      </p>

      <ul className="space-y-2">
        {result.series.map((series) => {
          const point = readPoint(result, series, index, counts);

          return (
            <li key={series.key}>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="w-3 shrink-0 rounded-full"
                  style={{ background: seriesColor(series.slot), height: 3 }}
                />

                <span className="min-w-0 flex-1 text-[var(--viz-text)]">
                  {point.y.label !== "" && <span className="text-[var(--viz-muted)]">{point.y.label}: </span>}
                  <span className="font-semibold">{point.y.value}</span>
                </span>
              </div>

              {series.key !== "all" && series.label !== result.yLabel && (
                <p className="truncate pl-5 leading-snug text-[var(--viz-muted)]">{series.label}</p>
              )}

              {point.detail && <p className="pl-5 leading-snug text-[var(--viz-muted)]">{point.detail}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
