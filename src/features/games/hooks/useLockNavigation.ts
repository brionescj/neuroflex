import { useEffect } from "react";

import { useGameLock } from "@/context";

/**
 * Mientras `active` sea true, la navegacion de la app (Sidebar, cerrar
 * sesion) queda inhabilitada. Se libera sola al desmontar el juego.
 *
 * Es un candado de la interfaz, no de seguridad: la barra de direcciones,
 * el boton atras del navegador o cerrar la pestana siguen existiendo. Por
 * eso el avance se guarda y se puede reanudar (ver useGameProgress).
 */
export function useLockNavigation(active: boolean) {
  const { setLocked } = useGameLock();

  useEffect(() => {
    setLocked(active);

    return () => setLocked(false);
  }, [active, setLocked]);
}
