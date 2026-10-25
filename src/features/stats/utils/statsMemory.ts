import { persistTabMemory, readTabMemory } from "@/lib/tabMemory";

import type { ChartResult, Catalog, Selection } from "../types";

/**
 * Lo que la vista «Estadísticas» recuerda al irse a otra pestaña (por ejemplo Desempeño) y volver: el
 * catálogo, lo elegido, el gráfico ya calculado y los pasos abiertos. Vive solo en memoria (se pierde al
 * recargar el sitio) y solo vale para el mismo administrador: otra persona que inicie sesión en el mismo
 * navegador no ve lo de la anterior.
 *
 * Además lo esencial (qué se eligió y si había un gráfico a la vista) se guarda en la pestaña
 * (`tabMemory`): si el navegador recarga la página —en el celular, al apagar y encender la pantalla— la
 * vista vuelve a como estaba y el gráfico se pide de nuevo. Los resultados no se guardan: se recalculan.
 */
export type StatsMemory = {
  /** RUT del administrador al que pertenece. */
  owner: string;
  catalog: Catalog | null;
  selection: Selection | null;
  shown: { result: ChartResult; subtitle: string; key: string } | null;
  open: Record<number, boolean>;
  /** Solo al volver tras una recarga: había un gráfico a la vista y hay que pedirlo de nuevo. */
  resume?: boolean;
};

let memory: StatsMemory | null = null;

const KEY = "stats";
/** Subir si cambia la forma de `Selection`: lo guardado con otra forma se descarta. */
const VERSION = 1;

type Saved = { v: number; owner: string; selection: Selection; open: Record<number, boolean>; hadChart: boolean };

function isSaved(value: unknown): value is Saved {
  if (typeof value !== "object" || value === null) return false;

  const saved = value as Partial<Saved>;
  const selection = saved.selection as Partial<Selection> | undefined;

  return (
    saved.v === VERSION &&
    typeof saved.owner === "string" &&
    typeof saved.hadChart === "boolean" &&
    typeof saved.open === "object" &&
    saved.open !== null &&
    typeof selection === "object" &&
    selection !== null &&
    typeof selection.game === "string" &&
    typeof selection.chart === "string"
  );
}

export function recallStats(owner: string): StatsMemory | null {
  if (memory !== null) return memory.owner === owner ? memory : null;

  const saved = readTabMemory(KEY);

  if (!isSaved(saved) || saved.owner !== owner) return null;

  return { owner, catalog: null, selection: saved.selection, shown: null, open: saved.open, resume: saved.hadChart };
}

export function rememberStats(next: StatsMemory): void {
  memory = next;
  persistTabMemory(KEY, () => {
    const latest = memory;

    return latest === null || latest.selection === null
      ? null
      : { v: VERSION, owner: latest.owner, selection: latest.selection, open: latest.open, hadChart: latest.shown !== null };
  });
}

export function forgetStats(): void {
  memory = null;
}
