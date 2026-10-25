export type ProgressOpKind = "save" | "clear";

type ProgressOp = {
  kind: ProgressOpKind;
  run: () => Promise<unknown>;
};

export type ProgressQueue = {
  enqueue: (kind: ProgressOpKind, run: () => Promise<unknown>) => void;
  /** Hay un guardado o borrado en curso o esperando: leer el avance ahora podria traer uno anterior. */
  isBusy: () => boolean;
};

/**
 * Ejecuta las operaciones de progreso de a UNA y en el orden en que se
 * pidieron.
 *
 * Por que existe: el servidor se queda con la ultima escritura que LLEGA,
 * no con la ultima que se PIDIO. Si dos guardados salen a la vez y el viejo
 * tarda mas (algo comun con `vercel dev`, donde cada funcion arranca lenta),
 * el estado viejo pisa al nuevo y al recargar el alumno vuelve atras.
 *
 * Regla de reemplazo: mientras una operacion esta en vuelo, los guardados
 * que se acumulan detras se reducen al mas reciente (los intermedios ya
 * quedaron obsoletos). Un borrado nunca se fusiona ni se salta: los
 * guardados anteriores y posteriores a un borrado no se mezclan.
 *
 * Un error en una operacion no detiene la cola; quien encola ya maneja el
 * resultado dentro de `run`.
 */
export function createProgressQueue(): ProgressQueue {
  let pending: ProgressOp[] = [];
  let running = false;

  async function drain() {
    if (running) return;
    running = true;

    while (pending.length > 0) {
      const op = pending.shift();
      if (!op) break;

      try {
        await op.run();
      } catch {
        // El llamador registra sus propios errores.
      }
    }

    running = false;
  }

  return {
    isBusy() {
      return running || pending.length > 0;
    },

    enqueue(kind, run) {
      const last = pending[pending.length - 1];

      if (kind === "save" && last?.kind === "save") {
        pending[pending.length - 1] = { kind, run };
      } else {
        pending.push({ kind, run });
      }

      void drain();
    },
  };
}

// Una cola por juego, a nivel de modulo: sobrevive a que el componente se
// desmonte y se vuelva a montar (incluido el doble montaje de StrictMode),
// asi dos instancias del mismo juego nunca escriben en paralelo.
const queues = new Map<string, ProgressQueue>();

export function getProgressQueue(gameId: string): ProgressQueue {
  let queue = queues.get(gameId);

  if (!queue) {
    queue = createProgressQueue();
    queues.set(gameId, queue);
  }

  return queue;
}
