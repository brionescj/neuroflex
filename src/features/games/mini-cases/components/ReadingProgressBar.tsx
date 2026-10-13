import { useEffect, useState } from "react";

type ReadingProgressBarProps = {
  durationMs: number;
};

export function ReadingProgressBar({ durationMs }: ReadingProgressBarProps) {
  const [isFull, setIsFull] = useState(true);

  useEffect(() => {
    setIsFull(true);

    // Se fuerza un frame con la barra llena antes de vaciarla para que el
    // navegador registre el estado inicial y anime la transicion completa
    // en vez de saltar directo a 0.
    const raf = requestAnimationFrame(() => setIsFull(false));

    return () => cancelAnimationFrame(raf);
  }, [durationMs]);

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className="h-full bg-sky-500 ease-linear"
        style={{
          width: isFull ? "100%" : "0%",
          transitionProperty: "width",
          transitionDuration: `${durationMs}ms`,
        }}
      />
    </div>
  );
}
