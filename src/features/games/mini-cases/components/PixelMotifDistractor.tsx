import { useEffect, useRef } from "react";

import type { PixelMotif } from "../types";

type PixelMotifDistractorProps = {
  motif: PixelMotif | null;
};

export function PixelMotifDistractor({ motif }: PixelMotifDistractorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !motif) return;

    const height = motif.grid.length;
    const width = motif.grid[0]?.length ?? 0;

    for (let y = 0; y < height; y++) {
      const row = motif.grid[y] ?? "";
      for (let x = 0; x < width; x++) {
        const key = row[x] ?? ".";
        ctx.fillStyle = motif.palette[key] ?? "#000000";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [motif]);

  if (!motif) return null;

  return (
    <canvas
      ref={canvasRef}
      width={motif.grid[0]?.length ?? 16}
      height={motif.grid.length}
      aria-hidden="true"
      className="h-40 w-full rounded-xl border border-zinc-700"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
