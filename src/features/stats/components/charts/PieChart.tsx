import { seriesColor } from "../../utils/colors";
import { formatNumber, formatValue } from "../../utils/format";
import type { ChartResult } from "../../types";
import { shares } from "./composition";

const SIZE = 148;
const RADIUS = 60;
const THICKNESS = 26;

/** Un arco de dona entre dos angulos (en radianes, desde las 12 en punto). */
function arcPath(from: number, to: number): string {
  const outer = RADIUS;
  const inner = RADIUS - THICKNESS;
  const c = SIZE / 2;
  const point = (angle: number, r: number) =>
    `${(c + r * Math.sin(angle)).toFixed(2)},${(c - r * Math.cos(angle)).toFixed(2)}`;
  const large = to - from > Math.PI ? 1 : 0;

  return [
    `M${point(from, outer)}`,
    `A${outer},${outer} 0 ${large} 1 ${point(to, outer)}`,
    `L${point(to, inner)}`,
    `A${inner},${inner} 0 ${large} 0 ${point(from, inner)}`,
    "Z",
  ].join(" ");
}

/**
 * Una dona por grupo comparado, solo para repartos de un total. Debajo de cada
 * una va la lista con el valor de cada parte, asi no hace falta pasar el cursor.
 */
export function PieChart({ result }: { result: ChartResult }) {
  return (
    <>
    <div className="grid gap-5 sm:grid-cols-2">
      {result.series.map((series) => {
        const parts = shares(series.values);
        const total = series.ns.reduce((sum, n) => sum + n, 0);
        const drawable = parts.some((part) => part > 0);

        let angle = 0;

        return (
          <figure key={series.key} className="flex flex-col items-center gap-3">
            <figcaption className="text-center text-xs text-[var(--viz-text-2)]">
              {series.key !== "all" && (
                <span className="block font-medium text-[var(--viz-text)]">{series.label}</span>
              )}
              <span className="text-[var(--viz-muted)]">
                Total de estudiantes: {formatNumber(series.n)}
              </span>
            </figcaption>

            {drawable ? (
              <svg
                role="img"
                aria-label={`${series.label}: ${result.categories
                  .map((category, i) => `${category} ${formatValue(series.values[i] ?? 0, result.unit)}`)
                  .join(", ")}`}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="size-40"
              >
                {parts.map((part, i) => {
                  if (part <= 0) return null;

                  const from = angle;
                  const to = angle + part * 2 * Math.PI;

                  angle = to;

                  // Una sola parte con todo el total es un anillo completo.
                  if (part >= 0.9999) {
                    return (
                      <g key={result.categories[i]}>
                        <circle
                          cx={SIZE / 2}
                          cy={SIZE / 2}
                          r={RADIUS - THICKNESS / 2}
                          fill="none"
                          stroke={seriesColor(i)}
                          strokeWidth={THICKNESS}
                        />
                        <title>{result.categories[i]}: 100 %</title>
                      </g>
                    );
                  }

                  return (
                    <path
                      key={result.categories[i]}
                      d={arcPath(from, to)}
                      fill={seriesColor(i)}
                      stroke="var(--viz-surface)"
                      strokeWidth={2}
                    >
                      <title>
                        {result.categories[i]}: {formatNumber(part * 100)} % ({series.ns[i] ?? 0})
                      </title>
                    </path>
                  );
                })}

                <text
                  x={SIZE / 2}
                  y={SIZE / 2 - 2}
                  textAnchor="middle"
                  className="fill-[var(--viz-text)] text-[15px] font-semibold"
                >
                  {formatNumber(total)}
                </text>
                <text
                  x={SIZE / 2}
                  y={SIZE / 2 + 12}
                  textAnchor="middle"
                  className="fill-[var(--viz-muted)] text-[9px]"
                >
                  {result.unitLabel}
                </text>
              </svg>
            ) : (
              <p className="py-10 text-xs text-[var(--viz-muted)]">Sin datos en este grupo</p>
            )}

            <ul className="w-full max-w-xs space-y-1 text-xs text-[var(--viz-text-2)]">
              {result.categories.map((category, i) => (
                <li key={category + i} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block size-2.5 shrink-0 rounded-sm"
                    style={{ background: seriesColor(i) }}
                  />
                  <span className="min-w-0 flex-1">{category}</span>
                  <span className="tabular-nums text-[var(--viz-text)]">
                    {drawable ? `${formatNumber((parts[i] ?? 0) * 100)} %` : "—"}
                  </span>
                  <span className="w-12 text-right tabular-nums text-[var(--viz-muted)]">
                    ({series.ns[i] ?? 0})
                  </span>
                </li>
              ))}
            </ul>
          </figure>
        );
      })}
    </div>

    <p className="text-[11px] leading-snug text-[var(--viz-muted)]">
      Entre paréntesis, el total de {result.unitLabel} en cada parte.
    </p>
    </>
  );
}
