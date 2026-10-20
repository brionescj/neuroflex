import { useRef, type PointerEvent as ReactPointerEvent } from "react";

import { getNodeColor, type NodeColorShape } from "../colors";
import { isPathComplete } from "../board";
import type { Cell, NodeColorId, NodeLevel, NodePaths } from "../types";

type NodeBoardProps = {
  level: NodeLevel;

  paths: NodePaths;

  activeColor: NodeColorId | null;

  blockedCell: Cell | null;

  disabled?: boolean;

  /** Posicion del puntero en unidades de celda, desde la esquina del tablero. */
  onPointerDown: (fx: number, fy: number) => void;

  onPointerMove: (fx: number, fy: number) => void;

  onPointerUp: () => void;
};

// Todo se dibuja en unidades de celda (viewBox = columnas x filas): el
// tablero escala solo y las medidas son las mismas en cualquier pantalla.
const CELL_GAP = 0.06;
const NODE_RADIUS = 0.34;
const PATH_WIDTH = 0.34;

function NodeGlyph({
  shape,
  cx,
  cy,
}: {
  shape: NodeColorShape;
  cx: number;
  cy: number;
}) {
  const ink = { fill: "#000", fillOpacity: 0.5 };
  const line = {
    fill: "none",
    stroke: "#000",
    strokeOpacity: 0.5,
    strokeLinecap: "round" as const,
  };

  switch (shape) {
    case "dot":
      return <circle cx={cx} cy={cy} r={0.1} {...ink} />;
    case "ring":
      return <circle cx={cx} cy={cy} r={0.12} strokeWidth={0.05} {...line} />;
    case "square":
      return (
        <rect x={cx - 0.1} y={cy - 0.1} width={0.2} height={0.2} {...ink} />
      );
    case "diamond":
      return (
        <polygon
          points={`${cx},${cy - 0.14} ${cx + 0.14},${cy} ${cx},${cy + 0.14} ${cx - 0.14},${cy}`}
          {...ink}
        />
      );
    case "triangle":
      return (
        <polygon
          points={`${cx},${cy - 0.14} ${cx + 0.13},${cy + 0.1} ${cx - 0.13},${cy + 0.1}`}
          {...ink}
        />
      );
    case "plus":
      return (
        <path
          d={`M${cx - 0.12} ${cy}H${cx + 0.12}M${cx} ${cy - 0.12}V${cy + 0.12}`}
          strokeWidth={0.06}
          {...line}
        />
      );
    case "star": {
      const points = Array.from({ length: 10 }, (_, i) => {
        const radius = i % 2 === 0 ? 0.17 : 0.07;
        const angle = -Math.PI / 2 + (Math.PI / 5) * i;
        return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
      }).join(" ");

      return <polygon points={points} {...ink} />;
    }
    case "hexagon": {
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i;
        return `${cx + 0.14 * Math.cos(angle)},${cy + 0.14 * Math.sin(angle)}`;
      }).join(" ");

      return <polygon points={points} {...ink} />;
    }
  }
}

export function NodeBoard({
  level,
  paths,
  activeColor,
  blockedCell,
  disabled = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: NodeBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  function toUnits(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) return null;

    return {
      fx: ((clientX - rect.left) / rect.width) * level.cols,
      fy: ((clientY - rect.top) / rect.height) * level.rows,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (disabled || !event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const point = toUnits(event.clientX, event.clientY);
    if (!point) return;

    try {
      // Asi el trazo sigue al puntero aunque el dedo se salga del tablero.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Algunos navegadores lo rechazan si el puntero ya no existe.
    }

    onPointerDown(point.fx, point.fy);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (disabled || !event.isPrimary) return;

    // Entre dos eventos de movimiento un dedo rapido puede cruzar varias
    // celdas: los eventos "coalescidos" son los puntos intermedios que el
    // navegador agrupo, y procesarlos todos evita saltos.
    const native = event.nativeEvent;
    const batch =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [];

    for (const sample of batch.length > 0 ? batch : [native]) {
      const point = toUnits(sample.clientX, sample.clientY);
      if (point) onPointerMove(point.fx, point.fy);
    }
  }

  function handlePointerEnd(event: ReactPointerEvent<SVGSVGElement>) {
    if (!event.isPrimary) return;

    onPointerUp();
  }

  const nodes = level.pairs.flatMap((pair) => [
    { pair, cell: pair.a },
    { pair, cell: pair.b },
  ]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${level.cols} ${level.rows}`}
      role="img"
      aria-label={`Tablero de ${level.rows} por ${level.cols} con ${level.pairs.length} pares de nodos de colores`}
      className="block w-full touch-none select-none rounded-2xl bg-zinc-900 [-webkit-touch-callout:none]"
      style={{ aspectRatio: `${level.cols} / ${level.rows}` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onContextMenu={(event) => event.preventDefault()}
    >
      {Array.from({ length: level.rows }, (_, row) =>
        Array.from({ length: level.cols }, (_, col) => (
          <rect
            key={`${row}-${col}`}
            x={col + CELL_GAP}
            y={row + CELL_GAP}
            width={1 - CELL_GAP * 2}
            height={1 - CELL_GAP * 2}
            rx={0.14}
            fill="#27272a"
          />
        )),
      )}

      {Object.entries(paths).map(([colorId, cells]) => {
        if (!cells || cells.length < 2) return null;

        const color = getNodeColor(colorId as NodeColorId);
        const complete = isPathComplete(level, paths, color.id);

        return (
          <polyline
            key={colorId}
            points={cells.map((c) => `${c.col + 0.5},${c.row + 0.5}`).join(" ")}
            fill="none"
            stroke={color.hex}
            strokeWidth={PATH_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={complete ? 1 : 0.85}
          />
        );
      })}

      {activeColor &&
        (() => {
          const cells = paths[activeColor];
          const head = cells?.[cells.length - 1];

          if (!head) return null;

          return (
            <circle
              cx={head.col + 0.5}
              cy={head.row + 0.5}
              r={0.52}
              fill={getNodeColor(activeColor).hex}
              fillOpacity={0.3}
            />
          );
        })()}

      {blockedCell && (
        <rect
          x={blockedCell.col + CELL_GAP}
          y={blockedCell.row + CELL_GAP}
          width={1 - CELL_GAP * 2}
          height={1 - CELL_GAP * 2}
          rx={0.14}
          fill="none"
          stroke="#f43f5e"
          strokeWidth={0.07}
        />
      )}

      {nodes.map(({ pair, cell }) => {
        const color = getNodeColor(pair.color);
        const cx = cell.col + 0.5;
        const cy = cell.row + 0.5;
        const connected = isPathComplete(level, paths, pair.color);

        return (
          <g key={`${pair.color}-${cell.row}-${cell.col}`}>
            <title>{`Nodo ${color.label}`}</title>

            <circle cx={cx} cy={cy} r={NODE_RADIUS} fill={color.hex} />

            {connected && (
              <circle
                cx={cx}
                cy={cy}
                r={NODE_RADIUS + 0.07}
                fill="none"
                stroke="#fff"
                strokeOpacity={0.9}
                strokeWidth={0.05}
              />
            )}

            <NodeGlyph shape={color.shape} cx={cx} cy={cy} />
          </g>
        );
      })}
    </svg>
  );
}
