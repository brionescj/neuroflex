/**
 * Memoria de la pestaña: lo que una pantalla recuerda (qué se eligió, a quién se miraba) y que debe
 * sobrevivir a que el navegador recargue la página, como pasa en el celular al apagarse la pantalla y
 * volver a encenderla. Usa `sessionStorage`: vive solo en esa pestaña, no pasa a otras y se pierde al
 * cerrarla. Se vacía al cerrar sesión o al entrar otra persona.
 *
 * Solo para estado de pantalla (filtros, selección, página). Nada de credenciales ni de resultados:
 * lo que se calcula se vuelve a pedir al servidor. La sesión sigue en `session.service.ts`.
 *
 * Nunca falla: si el navegador no deja usar `sessionStorage` (modo privado, bloqueado), la pantalla
 * simplemente no recuerda nada tras una recarga.
 */
const PREFIX = "neuroflex:vista:";
const DELAY_MS = 300;

const pending = new Map<string, () => unknown>();
let timer: ReturnType<typeof setTimeout> | undefined;
let listening = false;

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Escribe ya todo lo pendiente. */
export function flushTabMemory(): void {
  clearTimeout(timer);
  timer = undefined;

  const store = storage();

  for (const [key, build] of pending) {
    try {
      store?.setItem(PREFIX + key, JSON.stringify(build()));
    } catch {
      // Sin espacio o sin permiso: no se recuerda, y nada mas.
    }
  }

  pending.clear();
}

function listen(): void {
  if (listening || typeof document === "undefined") return;

  listening = true;

  // Al apagarse la pantalla o cambiar de aplicacion el navegador puede descartar la pestaña sin avisar
  // despues: se guarda en ese momento, sin esperar el plazo.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushTabMemory();
  });
  window.addEventListener("pagehide", flushTabMemory);
}

/**
 * Guarda `build()` bajo `key` en unos instantes (varios cambios seguidos, como escribir en un buscador,
 * se juntan en una sola escritura). `build` se evalua al escribir, así que guarda lo último.
 */
export function persistTabMemory(key: string, build: () => unknown): void {
  listen();
  pending.set(key, build);
  clearTimeout(timer);
  timer = setTimeout(flushTabMemory, DELAY_MS);
}

/** Lo guardado bajo `key` (sin validar: quien lo lee comprueba su forma) o null. */
export function readTabMemory(key: string): unknown {
  try {
    const raw = storage()?.getItem(PREFIX + key);

    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

/** Olvida todo: al cerrar sesion o cuando entra otra persona. */
export function clearTabMemory(): void {
  clearTimeout(timer);
  timer = undefined;
  pending.clear();

  const store = storage();

  if (!store) return;

  try {
    for (const key of Object.keys(store)) {
      if (key.startsWith(PREFIX)) store.removeItem(key);
    }
  } catch {
    // Sin permiso: no hay nada que olvidar.
  }
}
