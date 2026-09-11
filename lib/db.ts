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
    cached.promise = mongoose.connect(uri).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}