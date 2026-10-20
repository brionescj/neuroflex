import type { SendOutcome } from "./types";

/** Esperas entre reintentos cuando falla la red o el servidor. */
export const RETRY_DELAYS_MS = [1_000, 3_000, 8_000];

export type AttemptSender<T> = {
  /**
   * Encola un envio. Los envios salen de a uno y en orden (asi un "cerrar
   * intento" nunca llega antes que los resultados que lo anteceden). La
   * promesa nunca rechaza: dice si al final quedo guardado.
   */
  send: (body: T) => Promise<boolean>;
};

export function createAttemptSender<T>(
  post: (body: T) => Promise<SendOutcome>,
  delaysMs: number[] = RETRY_DELAYS_MS,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): AttemptSender<T> {
  let chain: Promise<unknown> = Promise.resolve();

  // Cuenta las veces que un envio se rindio. Los envios que ya estaban en
  // cola cuando eso ocurrio salen con un solo intento: si el servidor esta
  // caido, esperar 12 s por cada uno dejaria al estudiante mirando una
  // pantalla de carga varios minutos.
  let giveUps = 0;

  async function deliver(body: T, queuedAtGiveUps: number): Promise<boolean> {
    const retries = giveUps === queuedAtGiveUps ? delaysMs : [];

    for (let attempt = 0; ; attempt++) {
      let outcome: SendOutcome;

      try {
        outcome = await post(body);
      } catch {
        outcome = "retry";
      }

      if (outcome === "ok") return true;
      // El servidor dijo que el dato esta mal: reenviarlo no lo arregla.
      if (outcome === "rejected") return false;

      const delay = retries[attempt];

      if (delay === undefined) {
        giveUps++;
        return false;
      }

      await sleep(delay);
    }
  }

  return {
    send(body) {
      const queuedAtGiveUps = giveUps;
      const result = chain.then(() => deliver(body, queuedAtGiveUps));
      chain = result;

      return result;
    },
  };
}
