import { useEffect, type RefObject } from "react";

/** Cierra el tooltip al tocar fuera del grafico (en pantalla tactil no hay "salir del cursor"). */
export function useDismissOutside(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  close: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [ref, isOpen, close]);
}
