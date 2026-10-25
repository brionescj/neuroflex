import type { StatesByGame } from "../services/stats.service";
import type { Catalog, StudentProfile } from "../types";

/**
 * Lo que la vista «Desempeño» recuerda al irse a otra pestaña y volver: el buscador y la
 * página de la lista, a quién se estaba mirando y lo ya calculado. Vive solo en memoria (se
 * pierde al recargar el sitio) y solo vale para el mismo administrador: así otra persona que
 * inicie sesión en el mismo navegador no ve lo de la anterior.
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

export function recallDesempeno(owner: string): DesempenoMemory | null {
  return memory !== null && memory.owner === owner ? memory : null;
}

export function rememberDesempeno(next: DesempenoMemory): void {
  memory = next;
}

export function forgetDesempeno(): void {
  memory = null;
}
