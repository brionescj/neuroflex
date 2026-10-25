import { useEffect } from "react";

/**
 * Disuasivos contra capturas de pantalla y copias del juego. Una pagina web NO puede impedir una captura
 * (la hace el sistema operativo o la persona con otro aparato): esto solo quita las vias faciles dentro del
 * navegador. Se usa junto con la clase `game-guard` (oculta el juego al imprimir o guardar como PDF) y
 * `select-none` (sin seleccion ni "mantener pulsado" para guardar/copiar).
 *
 * - Sin menu contextual (clic derecho o pulsacion larga) ni arrastrar elementos.
 * - Tecla "Impr Pant": se intenta vaciar el portapapeles.
 */
export function useScreenshotDeterrents() {
  useEffect(() => {
    const block = (event: Event) => event.preventDefault();

    function onKeyUp(event: KeyboardEvent) {
      if (event.key === "PrintScreen") {
        void navigator.clipboard?.writeText("").catch(() => {});
      }
    }

    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
}

/** Clases que acompanan al hook en la raiz de cada juego. */
export const GAME_GUARD_CLASS = "game-guard select-none [-webkit-touch-callout:none]";
