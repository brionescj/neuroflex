/**
 * "Un juego se juega desde un solo lugar a la vez." Al abrir un juego, esta pestana reclama el juego con un
 * identificador propio (ver useGameLease); desde entonces cada peticion lo lleva en el encabezado
 * `X-Game-Lease` y, si otra pestana o dispositivo abrio el juego despues, el servidor responde 409
 * (codigo `game-opened-elsewhere`) y el juego de esta pestana queda en pausa.
 */
export const GAME_LEASE_HEADER = "X-Game-Lease";

export const GAME_LEASE_LOST_CODE = "game-opened-elsewhere";

let activeLease: string | null = null;

const lostListeners = new Set<() => void>();

export function setActiveLease(leaseId: string | null): void {
  activeLease = leaseId;
}

export function getActiveLease(): string | null {
  return activeLease;
}

/** Se llama cuando el servidor dice que el juego se abrio en otro lugar. */
export function notifyGameLeaseLost(): void {
  lostListeners.forEach((listener) => listener());
}

export function onGameLeaseLost(listener: () => void): () => void {
  lostListeners.add(listener);

  return () => {
    lostListeners.delete(listener);
  };
}

/** Identificador unico de esta apertura del juego. */
export function newLeaseId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
