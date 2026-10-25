/**
 * Peticiones compartidas en memoria, para no repetir lo que ya se pidio (o se esta pidiendo).
 *
 * Dos usos, con reglas distintas:
 *
 * - `sharedRequest`: una peticion reciente (o en curso) se reutiliza durante `reuseMs`. Para datos
 *   que se miran varias veces seguidas (el catalogo de estadisticas, la ficha del perfil).
 * - `prefetchOnce` + `takePrefetched`: se pide por adelantado lo que probablemente se abra a
 *   continuacion, y quien lo abre lo recoge UNA sola vez. Pasada esa vez (o el plazo) se vuelve a
 *   pedir al servidor. Para lo que debe estar al dia al abrirse (el avance de un juego).
 *
 * Todo vive solo en memoria y se vacia al iniciar o cerrar sesion (`forgetRequests`), asi lo de una
 * persona nunca se le muestra a otra. Una respuesta con error (`success: false` o rechazada) nunca
 * se guarda.
 */
type Outcome = { success: boolean };

type Entry = { at: number; promise: Promise<unknown>; ttlMs: number };

const entries = new Map<string, Entry>();

function remember<T extends Outcome>(key: string, promise: Promise<T>, ttlMs: number): void {
  const entry: Entry = { at: Date.now(), promise, ttlMs };

  entries.set(key, entry);

  const drop = () => {
    if (entries.get(key) === entry) entries.delete(key);
  };

  promise.then((response) => {
    if (!response.success) drop();
  }, drop);
}

/** Una peticion reciente o en curso se reutiliza durante `reuseMs`; si no, se hace de nuevo. */
export function sharedRequest<T extends Outcome>(key: string, load: () => Promise<T>, reuseMs: number): Promise<T> {
  const hit = entries.get(key);

  if (hit && Date.now() - hit.at < Math.min(reuseMs, hit.ttlMs)) return hit.promise as Promise<T>;

  const promise = load();

  remember(key, promise, reuseMs);

  return promise;
}

/** Lo ya guardado y vigente de `key`, sin pedir nada (para pintar al instante mientras se actualiza). */
export function peekShared<T extends Outcome>(key: string): Promise<T> | undefined {
  const hit = entries.get(key);

  return hit && Date.now() - hit.at < hit.ttlMs ? (hit.promise as Promise<T>) : undefined;
}

/** Pide por adelantado algo que se recogera con `takePrefetched`. No hace nada si ya hay uno vigente. */
export function prefetchOnce<T extends Outcome>(key: string, load: () => Promise<T>, ttlMs: number): void {
  const hit = entries.get(key);

  if (hit && Date.now() - hit.at < hit.ttlMs) return;

  remember(key, load(), ttlMs);
}

/** Recoge (y borra) lo pedido por adelantado, si sigue vigente. Despues de recogerlo, pedir de nuevo es normal. */
export function takePrefetched<T extends Outcome>(key: string): Promise<T> | undefined {
  const hit = entries.get(key);

  entries.delete(key);

  return hit && Date.now() - hit.at < hit.ttlMs ? (hit.promise as Promise<T>) : undefined;
}

/** Descarta lo guardado cuyo nombre empiece por `prefix` (todo, si no se indica). */
export function forgetRequests(prefix = ""): void {
  for (const key of [...entries.keys()]) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}
