import { useEffect } from "react";

/**
 * Un navegador NUNCA permite a una pagina bloquear de verdad el cierre de
 * pestaña, F5, o el boton atras del sistema — solo puede pedirle al
 * navegador que muestre su propio dialogo de confirmacion nativo. Esto es
 * ese aviso, no un bloqueo real; la forma real de no perder progreso ante
 * un F5 o un cierre accidental es guardar y poder reanudar, no impedir
 * salir.
 */
export function useWarnBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active]);
}
