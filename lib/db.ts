import mongoose from "mongoose";

import { getRequiredEnv } from "./env";

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

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        // Si Atlas no responde, falla en 8 s en vez de los 30 s por defecto:
        // el usuario ve el error y reintenta, en lugar de quedarse esperando.
        serverSelectionTimeoutMS: 8000,
        // Cada instancia atiende pocas peticiones a la vez; un pool chico basta
        // y no agota las conexiones del cluster cuando hay varias instancias.
        maxPoolSize: 10,
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

  cached.conn = await cached.promise;
  return cached.conn;
}
