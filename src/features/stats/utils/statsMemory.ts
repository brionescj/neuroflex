import type { ChartResult, Catalog, Selection } from "../types";

/**
 * Lo que la vista «Estadísticas» recuerda al irse a otra pestaña (por ejemplo Desempeño) y volver: el
 * catálogo, lo elegido, el gráfico ya calculado y los pasos abiertos. Vive solo en memoria (se pierde al
 * recargar el sitio) y solo vale para el mismo administrador: otra persona que inicie sesión en el mismo
 * navegador no ve lo de la anterior.
 */
export type StatsMemory = {
  /** RUT del administrador al que pertenece. */
  owner: string;
  catalog: Catalog | null;
  selection: Selection | null;
  shown: { result: ChartResult; subtitle: string; key: string } | null;
  open: Record<number, boolean>;
};

let memory: StatsMemory | null = null;

export function recallStats(owner: string): StatsMemory | null {
  return memory !== null && memory.owner === owner ? memory : null;
}

export function rememberStats(next: StatsMemory): void {
  memory = next;
}

export function forgetStats(): void {
  memory = null;
}
