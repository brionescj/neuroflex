import mongoose from "mongoose";

import { getRequiredEnv } from "./env.js";
import { runStartupTasks } from "./startupTasks.js";
import { addDbTime } from "./timing.js";

const uri = getRequiredEnv("MONGODB_URI");

// Una funcion serverless puede reutilizar el mismo proceso entre
// invocaciones cercanas en el tiempo. Sin este cache, cada invocacion
// abriria una conexion nueva a Atlas y bajo uso concurrente se agota
// el limite de conexiones del cluster M0. Esto es justo el detalle que
// te advertí que Vercel agrega respecto a un Express tradicional.
let cached = (global as any)._mongooseConn;

if (!cached) {
  cached = (global as any)._mongooseConn = { conn: null, promise: null };
}

function open() {
  return mongoose
    .connect(uri, {
      // Si Atlas no responde, falla en 8 s en vez de los 30 s por defecto:
      // el usuario ve el error y reintenta, en lugar de quedarse esperando.
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      // Cada instancia atiende pocas peticiones a la vez; un pool chico basta
      // y no agota las conexiones del cluster cuando hay varias instancias.
      maxPoolSize: 10,
      // Vercel congela el proceso entre peticiones: una conexion que estuvo quieta
      // mas de unos segundos puede haber sido cerrada por Atlas sin que el proceso
      // se enterara. Descartarlas antes evita que la primera consulta despues de una
      // pausa espere a que el controlador descubra que el socket murio.
      maxIdleTimeMS: 15000,
    })
    .then((m) => m)
    .catch((error) => {
      // Si la conexion fallo, se descarta la promesa: de lo contrario todas las
      // peticiones siguientes de esta instancia recibirian el mismo error
      // guardado, aunque Atlas ya hubiera vuelto.
      cached.promise = null;
      throw error;
    });
}

/**
 * Datos que el servidor deja listos al arrancar (el banco de mini casos, por ejemplo). Corre una vez por
 * proceso: las peticiones siguientes reutilizan el resultado. Si falla, se reintenta en la proxima
 * peticion en vez de dejar el error guardado, y esta no se interrumpe.
 */
async function runStartupTasksOnce() {
  const store = global as unknown as { _startupTasks?: Promise<void> | null };

  if (!store._startupTasks) {
    store._startupTasks = runStartupTasks().catch(() => {
      store._startupTasks = null;
    });
  }

  await store._startupTasks;
}

export async function connectDB() {
  const startedAt = performance.now();

  try {
    // Conectado de verdad (no solo "alguna vez conectado"): si la conexion se cayo,
    // se vuelve a abrir en vez de usar una muerta.
    if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;

    if (cached.conn) {
      cached.conn = null;
      cached.promise = null;
    }

    if (!cached.promise) cached.promise = open();

    cached.conn = await cached.promise;

    await runStartupTasksOnce();

    return cached.conn;
  } finally {
    addDbTime(performance.now() - startedAt);
  }
}
