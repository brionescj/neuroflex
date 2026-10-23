import { useCallback, useState, type KeyboardEvent, type PointerEvent } from "react";

import { seriesColor } from "../../utils/colors";
import { formatTick, formatValue } from "../../utils/format";
import { dataMaxOf, valueScale } from "../../utils/scale";
import type { ChartResult } from "../../types";
import { ChartTooltip } from "./ChartTooltip";
import { labelStep, textWidth } from "./geometry";
import { useDismissOutside } from "./useDismissOutside";
import { useElementWidth } from "./useElementWidth";

const FONT = 11;
/** Pocos datos detras de un punto: se dibuja hueco. */
const HOLLOW_BELOW = 3;
const MAX_MARKERS = 31;
const DIRECT_LABEL_MIN_WIDTH = 560;
const DIRECT_LABEL_AREA = 112;

/** Segmentos continuos de una serie: un valor que falta corta la linea. */
function segments(points: ({ x: number; y: number } | null)[]): string[] {
  const paths: string[] = [];
  let current = "";

  for (const point of points) {
    if (point === null) {
      if (current !== "") paths.push(current);

      current = "";
      continue;
    }

    current += `${current === "" ? "M" : "L"}${point.x},${point.y} `;
  }

  if (current !== "") paths.push(current);

  return paths;
}

export function LineChart({ result }: { result: ChartResult }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const close = useCallback(() => setActive(null), []);

  useDismissOutside(ref, active !== null, close);

  const count = result.categories.length;
  const scale = valueScale(result.unit, dataMaxOf(result.series));
  const wide = width >= DIRECT_LABEL_MIN_WIDTH && result.series.length >= 2 && result.series.length <= 4;

  const TOP = 24;
  const LEFT = 8 + Math.max(...scale.ticks.map((t) => formatTick(t).length)) * 7;
  const RIGHT = wide ? DIRECT_LABEL_AREA : 16;
  const PAD = 10;
  const plotW = Math.max(width - LEFT - RIGHT, 40);
  const plotH = 200;
  const BOTTOM = 40;
  const height = TOP + plotH + BOTTOM;

  const xOf = (i: number) =>
    count <= 1 ? LEFT + plotW / 2 : LEFT + PAD + (i * (plotW - PAD * 2)) / (count - 1);
  const yOf = (v: number) => TOP + plotH - (v / scale.max) * plotH;

  const maxLabel = Math.max(0, ...result.categories.map((c) => c.length));
  const step = labelStep(count, plotW, textWidth("x".repeat(maxLabel)));
  const showMarkers = count <= MAX_MARKERS;

  function nearest(clientX: number, target: SVGElement) {
    const box = target.ownerSVGElement?.getBoundingClientRect() ?? target.getBoundingClientRect();
    const x = clientX - box.left;

    if (count <= 1) return 0;

    const index = Math.round(((x - LEFT - PAD) / (plotW - PAD * 2)) * (count - 1));

    return Math.min(Math.max(index, 0), count - 1);
  }

  function onPointer(event: PointerEvent<SVGRectElement>) {
    setActive(nearest(event.clientX, event.currentTarget));
  }

  function onKey(event: KeyboardEvent<SVGRectElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActive((current) => Math.min((current ?? -1) + 1, count - 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActive((current) => Math.max((current ?? count) - 1, 0));
    } else if (event.key === "Escape") {
      setActive(null);
    }
  }

  // Etiquetas directas al final de cada linea, solo si no se pisan.
  const ends = result.series
    .map((series) => {
      let last = -1;

      series.values.forEach((value, i) => {
        if (value !== null) last = i;
      });

      return last < 0 ? null : { series, i: last, y: yOf(series.values[last] as number) };
    })
    .filter((end): end is NonNullable<typeof end> => end !== null);

  const sorted = [...ends].sort((a, b) => a.y - b.y);
  const collide = sorted.some((end, i) => i > 0 && end.y - (sorted[i - 1] as { y: number }).y < 14);
  const direct = wide && !collide;

  const label = (index: number) =>
    `${result.categories[index]}. ${result.series
      .map((s) => {
        const value = s.values[index] ?? null;

        return `${s.label}: ${value === null ? "sin datos" : formatValue(value, result.unit)}`;
      })
      .join(". ")}`;

  const single = result.series.length === 1;

  return (
    <div
      ref={ref}
      className="relative w-full"
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={`${result.title}. La vista de tabla muestra todos los valores.`}
        className="block touch-pan-y select-none"
      >
        <text x={0} y={12} fontSize={FONT} fill="var(--viz-muted)">
          {result.yLabel}
        </text>

        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={LEFT}
              x2={LEFT + plotW}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke={tick === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
              strokeWidth={1}
            />
            <text
              x={LEFT - 6}
              y={yOf(tick) + 4}
              textAnchor="end"
              fontSize={FONT}
              fill="var(--viz-muted)"
              className="tabular-nums"
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {result.categories.map((category, i) =>
          i % step === 0 ? (
            <text
              key={category + i}
              x={xOf(i)}
              y={TOP + plotH + 16}
              textAnchor="middle"
              fontSize={FONT}
              fill="var(--viz-muted)"
            >
              {category}
            </text>
          ) : null,
        )}

        <text
          x={LEFT + plotW / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize={FONT}
          fill="var(--viz-muted)"
        >
          {result.xLabel}
        </text>

        {active !== null && (
          <line
            x1={xOf(active)}
            x2={xOf(active)}
            y1={TOP}
            y2={TOP + plotH}
            stroke="var(--viz-muted)"
            strokeWidth={1}
          />
        )}

        {result.series.map((series) => {
          const color = seriesColor(series.slot);
          const points = series.values.map((value, i) =>
            value === null ? null : { x: xOf(i), y: yOf(value) },
          );

          return (
            <g key={series.key}>
              {segments(points).map((d, n) => (
                <path
                  key={n}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {points.map((point, i) => {
                if (point === null) return null;

                const isLast = i === series.values.length - 1;

                if (!showMarkers && !isLast && active !== i) return null;

                // Con un solo estudiante por serie (comparar estudiantes) todo seria hueco: no aplica.
                const hollow = series.n > 1 && (series.ns[i] ?? 0) < HOLLOW_BELOW;

                return (
                  <circle
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill={hollow ? "var(--viz-surface)" : color}
                    stroke={hollow ? color : "var(--viz-surface)"}
                    strokeWidth={2}
                    paintOrder="stroke"
                  />
                );
              })}
            </g>
          );
        })}

        {single &&
          ends.map(({ series, i, y }) => (
            <text
              key={series.key}
              x={Math.min(xOf(i), LEFT + plotW - 4)}
              y={y - 10}
              textAnchor="end"
              fontSize={FONT}
              fill="var(--viz-text-2)"
              className="tabular-nums"
            >
              {formatTick(series.values[i] as number)}
            </text>
          ))}

        {direct &&
          ends.map(({ series, i, y }) => (
            <text
              key={series.key}
              x={xOf(i) + 10}
              y={y + 4}
              fontSize={FONT}
              fill="var(--viz-text-2)"
            >
              {series.label.length > 16 ? `${series.label.slice(0, 15)}…` : series.label}
            </text>
          ))}

        <rect
          x={LEFT}
          y={TOP}
          width={plotW}
          height={plotH}
          fill="transparent"
          tabIndex={0}
          role="img"
          aria-label={
            active === null
              ? `${result.title}. Usa las flechas para recorrer los valores.`
              : label(active)
          }
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        />
      </svg>

      {active !== null && (
        <ChartTooltip
          result={result}
          index={active}
          x={xOf(active)}
          y={TOP + 60}
          containerWidth={width}
        />
      )}
    </div>
  );
}
