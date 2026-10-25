import { AsyncLocalStorage } from "node:async_hooks";

import type { VercelResponse } from "@vercel/node";

/**
 * Medicion de cada peticion para saber DONDE se van los segundos: si la funcion
 * estaba "fria" (recien arrancada), cuanto espero la conexion a la base y cuanto
 * duro en total. Se entrega en la cabecera estandar Server-Timing, que el navegador
 * muestra en Herramientas de desarrollador > Red > (peticion) > Tiempos.
 */
type Context = { startedAt: number; dbMs: number; cold: boolean };

const storage = new AsyncLocalStorage<Context>();

let firstRequest = true;

/** El tiempo que lleva el proceso vivo al llegar la primera peticion: lo que costo arrancar. */
const processAgeAtFirstRequest = () => Math.round(process.uptime() * 1000);

/** Umbral a partir del cual una peticion se deja anotada en el registro del servidor. */
export const SLOW_REQUEST_MS = 2000;

export function runTimed<T>(res: VercelResponse, label: string, work: () => T): T {
  const context: Context = { startedAt: performance.now(), dbMs: 0, cold: firstRequest };
  const bootMs = firstRequest ? processAgeAtFirstRequest() : 0;

  firstRequest = false;

  // La cabecera se completa justo antes de enviarse (aun no se conoce cuanto durara el handler).
  if (typeof res.writeHead === "function") {
    const original = res.writeHead.bind(res) as (...args: unknown[]) => unknown;

    (res as unknown as { writeHead: (...args: unknown[]) => unknown }).writeHead = (...args: unknown[]) => {
      const total = Math.round(performance.now() - context.startedAt);
      const parts = [`total;dur=${total}`, `db;dur=${Math.round(context.dbMs)}`];

      if (context.cold) parts.push(`arranque;dur=${bootMs}`);

      try {
        res.setHeader("Server-Timing", parts.join(", "));
      } catch {
        // Si las cabeceras ya salieron no hay nada que agregar.
      }

      if (total >= SLOW_REQUEST_MS) {
        console.warn(
          `[lento] ${label} ${total} ms (base de datos ${Math.round(context.dbMs)} ms${context.cold ? `, arranque en frio ${bootMs} ms` : ""})`,
        );
      }

      return original(...args);
    };
  }

  return storage.run(context, work);
}

/** Suma el tiempo que esta peticion espero a la base (lo llama connectDB). */
export function addDbTime(ms: number): void {
  const context = storage.getStore();

  if (context) context.dbMs += ms;
}
