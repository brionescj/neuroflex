import { createContext, useContext } from "react";

/**
 * Verdadero cuando el grafico se dibuja para el PDF. La hoja se arma a un ancho fijo, asi que
 * las columnas no pueden depender del tamaño de la pantalla (sm:, lg:) desde donde se descarga.
 */
export const PrintModeContext = createContext(false);

export function usePrintMode(): boolean {
  return useContext(PrintModeContext);
}
