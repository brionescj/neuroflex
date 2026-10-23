import { useCallback, useState } from "react";

import { seriesColor } from "../../utils/colors";
import { dataMaxOf, valueScale } from "../../utils/scale";
import { formatTick, formatValue } from "../../utils/format";
import type { ChartResult } from "../../types";
import { ChartTooltip } from "./ChartTooltip";
import {
  barPath,
  columnPath,
  labelStep,
  textWidth,
  wrapLabel,
} from "./geometry";
import { useDismissOutside } from "./useDismissOutside";
import { useElementWidth } from "./useElementWidth";

const GAP = 2;
const MAX_BAR = 24;
const FONT = 11;

type Active = { index: number; x: number; y: number } | null;

/**
 * Barras agrupadas. Se dibujan en columnas cuando las etiquetas caben y las
 * barras no quedan demasiado finas; si no, en filas (con las etiquetas a la
 * izquierda), que es lo que pasa en el celular con nombres largos.
 */
export function BarChart({ result }: { result: ChartResult }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<Active>(null);
  const close = useCallback(() => setActive(null), []);

  useDismissOutside(ref, active !== null, close);

  const count = result.categories.length;
  const k = Math.max(result.series.length, 1);
  const scale = valueScale(result.unit, dataMaxOf(result.series));
  const maxLabel = Math.max(0, ...result.categories.map((c) => c.length));

  const TOP = 24;
  const LEFT_V = 8 + Math.max(...scale.ticks.map((t) => formatTick(t).length)) * 7;
  const RIGHT = 12;
  const plotW = Math.max(width - LEFT_V - RIGHT, 40);
  const band = plotW / Math.max(count, 1);
  const barW = Math.min(MAX_BAR, (band * 0.8 - GAP * (k - 1)) / k);
  const numericLike = maxLabel <= 3;
  const vertical = barW >= 5 && (textWidth("x".repeat(maxLabel)) + 6 <= band || numericLike);

  const labelMode = result.series.length === 1;

  function show(index: number, x: number, y: number) {
    setActive({ index, x, y });
  }

  const label = (index: number) => {
    const parts = result.series.map((s) => {
      const value = s.values[index] ?? null;

      return `${s.label}: ${value === null ? "sin datos" : formatValue(value, result.unit)}`;
    });

    return `${result.categories[index]}. ${parts.join(". ")}`;
  };

  let body: React.ReactNode;
  let height: number;

  if (vertical) {
    const plotH = 200;
    const BOTTOM = 40;
    const step = labelStep(count, plotW, textWidth("x".repeat(maxLabel)));
    const yOf = (v: number) => TOP + plotH - (v / scale.max) * plotH;

    height = TOP + plotH + BOTTOM;

    body = (
      <>
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={LEFT_V}
              x2={LEFT_V + plotW}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke={tick === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
              strokeWidth={1}
            />
            <text
              x={LEFT_V - 6}
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

        {result.categories.map((category, i) => {
          const bandX = LEFT_V + i * band;
          const groupW = k * barW + GAP * (k - 1);
          const startX = bandX + (band - groupW) / 2;
          const isActive = active?.index === i;

          return (
            <g key={category + i}>
              {isActive && (
                <rect x={bandX} y={TOP} width={band} height={plotH} fill="white" opacity={0.04} />
              )}

              {result.series.map((series, s) => {
                const value = series.values[i] ?? null;

                if (value === null || value <= 0) return null;

                const h = Math.max((value / scale.max) * plotH, 1);
                const x = startX + s * (barW + GAP);

                return (
                  <path
                    key={series.key}
                    d={columnPath(x, TOP + plotH - h, barW, h)}
                    fill={seriesColor(series.slot)}
                    style={isActive ? { filter: "brightness(1.2)" } : undefined}
                  />
                );
              })}

              {labelMode && band >= 28 && (result.series[0]?.values[i] ?? null) !== null && (
                <text
                  x={bandX + band / 2}
                  y={yOf(result.series[0]?.values[i] ?? 0) - 5}
                  textAnchor="middle"
                  fontSize={FONT}
                  fill="var(--viz-text-2)"
                  className="tabular-nums"
                >
                  {formatTick(result.series[0]?.values[i] ?? 0)}
                </text>
              )}

              {i % step === 0 && (
                <text
                  x={bandX + band / 2}
                  y={TOP + plotH + 16}
                  textAnchor="middle"
                  fontSize={FONT}
                  fill="var(--viz-muted)"
                >
                  {category}
                </text>
              )}

              <rect
                x={bandX}
                y={TOP}
                width={band}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={label(i)}
                onPointerEnter={() => show(i, bandX + band / 2, TOP + 60)}
                onPointerDown={() => show(i, bandX + band / 2, TOP + 60)}
                onFocus={() => show(i, bandX + band / 2, TOP + 60)}
                onBlur={() => setActive(null)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
              />
            </g>
          );
        })}

        <text
          x={LEFT_V + plotW / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize={FONT}
          fill="var(--viz-muted)"
        >
          {result.xLabel}
        </text>
      </>
    );
  } else {
    const LEFT_H = Math.min(Math.max(width * 0.36, 96), 160);
    const hPlotW = Math.max(width - LEFT_H - 40, 40);
    const barH = k === 1 ? 16 : Math.max(6, Math.min(14, 40 / k));
    const block = k * barH + GAP * (k - 1) + 14;
    const BOTTOM = 40;
    const maxChars = Math.floor((LEFT_H - 10) / 6.3);
    const xOf = (v: number) => LEFT_H + (v / scale.max) * hPlotW;

    height = TOP + count * block + BOTTOM;

    body = (
      <>
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={xOf(tick)}
              x2={xOf(tick)}
              y1={TOP}
              y2={TOP + count * block}
              stroke={tick === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
              strokeWidth={1}
            />
            <text
              x={xOf(tick)}
              y={TOP + count * block + 16}
              textAnchor="middle"
              fontSize={FONT}
              fill="var(--viz-muted)"
              className="tabular-nums"
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {result.categories.map((category, i) => {
          const rowY = TOP + i * block;
          const isActive = active?.index === i;
          const lines = wrapLabel(category, maxChars);
          const startY = rowY + 7;

          return (
            <g key={category + i}>
              {isActive && (
                <rect x={0} y={rowY} width={width} height={block} fill="white" opacity={0.04} />
              )}

              <text fontSize={FONT} fill="var(--viz-text-2)">
                {lines.map((line, n) => (
                  <tspan
                    key={n}
                    x={LEFT_H - 8}
                    y={rowY + block / 2 + (n - (lines.length - 1) / 2) * 13 + 4}
                    textAnchor="end"
                  >
                    {line}
                  </tspan>
                ))}
              </text>

              {result.series.map((series, s) => {
                const value = series.values[i] ?? null;

                if (value === null || value <= 0) return null;

                const w = Math.max((value / scale.max) * hPlotW, 1);

                return (
                  <g key={series.key}>
                    <path
                      d={barPath(LEFT_H, startY + s * (barH + GAP), w, barH)}
                      fill={seriesColor(series.slot)}
                      style={isActive ? { filter: "brightness(1.2)" } : undefined}
                    />
                    {labelMode && (
                      <text
                        x={LEFT_H + w + 5}
                        y={startY + s * (barH + GAP) + barH / 2 + 4}
                        fontSize={FONT}
                        fill="var(--viz-text-2)"
                        className="tabular-nums"
                      >
                        {formatTick(value)}
                      </text>
                    )}
                  </g>
                );
              })}

              <rect
                x={0}
                y={rowY}
                width={width}
                height={block}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={label(i)}
                onPointerEnter={() => show(i, LEFT_H + hPlotW / 2, rowY)}
                onPointerDown={() => show(i, LEFT_H + hPlotW / 2, rowY)}
                onFocus={() => show(i, LEFT_H + hPlotW / 2, rowY)}
                onBlur={() => setActive(null)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
              />
            </g>
          );
        })}

        <text
          x={LEFT_H + hPlotW / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize={FONT}
          fill="var(--viz-muted)"
        >
          {result.yLabel}
        </text>
      </>
    );
  }

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
        <text x={vertical ? 0 : 0} y={12} fontSize={FONT} fill="var(--viz-muted)">
          {vertical ? result.yLabel : result.xLabel}
        </text>

        {body}
      </svg>

      {active && (
        <ChartTooltip
          result={result}
          index={active.index}
          x={active.x}
          y={active.y}
          containerWidth={width}
        />
      )}
    </div>
  );
}
