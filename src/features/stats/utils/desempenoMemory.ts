import { persistTabMemory, readTabMemory } from "@/lib/tabMemory";

import type { StatesByGame } from "../services/stats.service";
import type { Catalog, StudentProfile } from "../types";

/**
 * Lo que la vista «Desempeño» recuerda al irse a otra pestaña y volver: el buscador y la
 * página de la lista, a quién se estaba mirando y lo ya calculado. Vive solo en memoria (se
 * pierde al recargar el sitio) y solo vale para el mismo administrador: así otra persona que
 * inicie sesión en el mismo navegador no ve lo de la anterior.
 *
 * Además lo esencial (a quién se miraba, el buscador, la página) se guarda en la pestaña (`tabMemory`):
 * si el navegador recarga la página —en el celular, al apagar y encender la pantalla— la vista vuelve
 * con ese estudiante y su desempeño se calcula de nuevo. Los resultados no se guardan.
 */
export type DesempenoMemory = {
  /** RUT del administrador al que pertenece. */
  owner: string;
  /** Estudiante que se estaba mirando; vacío si estaba la lista. */
  rut: string;
  /** Estaba abierta la lista para cambiar de estudiante. */
  choosing: boolean;
  query: string;
  page: number;
  catalog: Catalog | null;
  profile: { rut: string; profile: StudentProfile; key: string } | null;
  /** Las partidas que dejó entrar en los gráficos, para el estudiante que se miraba. */
  choice: { rut: string; states: StatesByGame };
};

let memory: DesempenoMemory | null = null;

const KEY = "desempeno";
/** Subir si cambia la forma de lo guardado: lo guardado con otra forma se descarta. */
const VERSION = 1;

type Saved = {
  v: number;
  owner: string;
  rut: string;
  choosing: boolean;
  query: string;
  page: number;
  choice: { rut: string; states: StatesByGame };
};

function isSaved(value: unknown): value is Saved {
  if (typeof value !== "object" || value === null) return false;

  const saved = value as Partial<Saved>;

  return (
    saved.v === VERSION &&
    typeof saved.owner === "string" &&
    typeof saved.rut === "string" &&
    typeof saved.choosing === "boolean" &&
    typeof saved.query === "string" &&
    typeof saved.page === "number" &&
    typeof saved.choice === "object" &&
    saved.choice !== null &&
    typeof saved.choice.rut === "string" &&
    typeof saved.choice.states === "object" &&
    saved.choice.states !== null
  );
}

export function recallDesempeno(owner: string): DesempenoMemory | null {
  if (memory !== null) return memory.owner === owner ? memory : null;

  const saved = readTabMemory(KEY);

  if (!isSaved(saved) || saved.owner !== owner) return null;

  return {
    owner,
    rut: saved.rut,
    choosing: saved.choosing,
    query: saved.query,
    page: saved.page,
    catalog: null,
    profile: null,
    choice: saved.choice,
  };
}

export function rememberDesempeno(next: DesempenoMemory): void {
  memory = next;
  persistTabMemory(KEY, () => {
    const latest = memory;

    return latest === null
      ? null
      : { v: VERSION, owner: latest.owner, rut: latest.rut, choosing: latest.choosing, query: latest.query, page: latest.page, choice: latest.choice };
  });
}

export function forgetDesempeno(): void {
  memory = null;
}
