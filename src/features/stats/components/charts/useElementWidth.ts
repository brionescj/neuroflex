import { useEffect, useRef, useState } from "react";

/** Ancho actual de un elemento, para dibujar el grafico a su medida real. */
export function useElementWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    setWidth(Math.round(element.getBoundingClientRect().width) || fallback);

    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);

      if (next > 0) setWidth(next);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [fallback]);

  return { ref, width };
}
