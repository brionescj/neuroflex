import type { GameBreakdown } from "../types";

/** Lo que dice el encabezado de un juego: cuántas partidas tiene y cómo terminaron. */
export function breakdownText(breakdown: GameBreakdown): string {
  const { total, finished, failed, open } = breakdown;

  return `${total} ${total === 1 ? "partida" : "partidas"}: ${finished} ${finished === 1 ? "terminada" : "terminadas"} · ${failed} ${failed === 1 ? "fallida" : "fallidas"} · ${open} sin terminar`;
}
