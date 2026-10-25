/**
 * Diagnostico de velocidad hacia MongoDB Atlas: mide, desde ESTE computador, cuanto tarda cada
 * etapa de una conexion y de una consulta. Solo lee (ping y una consulta de un documento).
 *
 *   npm run diag:db
 *   (lee MONGODB_URI de .env.local o de .env, o del entorno si ya esta definida)
 *
 * Como leerlo: si "primera consulta" y "consultas siguientes" son bajas (< 300 ms) la base
 * no es el problema: la lentitud viene de como se levanta la API (por ejemplo `vercel dev`,
 * que arranca la funcion de nuevo en cada peticion). Si son altas, el problema es la red o
 * Atlas, y la etapa que mas pesa dice cual.
 */
import { promises as dns } from "node:dns";
import { existsSync } from "node:fs";
import net from "node:net";
import tls from "node:tls";

import mongoose from "mongoose";

for (const file of [".env.local", ".env"]) {
  if (!process.env.MONGODB_URI && existsSync(file)) process.loadEnvFile(file);
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("Falta MONGODB_URI. Ponla en .env.local o en .env.");
  process.exit(1);
}

const ms = (since: number) => Math.round(performance.now() - since);
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
const line = (label: string, value: string) => console.log(`${label.padEnd(34)} ${value}`);

async function timed<T>(label: string, work: () => Promise<T>): Promise<T | undefined> {
  const start = performance.now();

  try {
    const result = await work();

    line(label, `${ms(start)} ms`);

    return result;
  } catch (error) {
    line(label, `FALLO tras ${ms(start)} ms (${error instanceof Error ? error.message : String(error)})`);

    return undefined;
  }
}

/** Abre un socket (con TLS si hace falta) y mide hasta que queda listo. */
function socketTime(host: string, port: number, secure: boolean): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const socket = secure
      ? tls.connect({ host, port, servername: host }, () => done())
      : net.connect({ host, port }, () => done());

    function done() {
      const took = ms(start);

      socket.destroy();
      resolve(took);
    }

    socket.setTimeout(10_000, () => {
      socket.destroy();
      reject(new Error("sin respuesta en 10 s"));
    });
    socket.on("error", reject);
  });
}

async function main() {
  const parsed = new URL(uri as string);
  const srv = parsed.protocol === "mongodb+srv:";

  console.log(`\nDestino: ${parsed.hostname} (${srv ? "mongodb+srv" : "mongodb"})  usuario: ${decodeURIComponent(parsed.username)}\n`);

  let host = parsed.hostname;
  let port = Number(parsed.port) || 27017;

  if (srv) {
    const records = await timed("DNS SRV (lista de servidores)", () => dns.resolveSrv(`_mongodb._tcp.${parsed.hostname}`));
    const first = records?.[0];

    if (first) {
      host = first.name;
      port = first.port;
    }

    await timed("DNS TXT (opciones)", () => dns.resolveTxt(parsed.hostname));
  }

  await timed(`DNS A/AAAA de ${host}`, () => dns.lookup(host, { all: true }));
  await timed("TCP + TLS al servidor", () => socketTime(host, port, true));

  const connectStart = performance.now();

  try {
    await mongoose.connect(uri as string, { serverSelectionTimeoutMS: 15_000, connectTimeoutMS: 15_000 });
    line("Conexion completa (mongoose)", `${ms(connectStart)} ms`);
  } catch (error) {
    line("Conexion completa (mongoose)", `FALLO tras ${ms(connectStart)} ms (${error instanceof Error ? error.message : String(error)})`);
    console.log("\nSi falla: revisa la lista de IP permitidas en Atlas (Network Access), usuario y contrasena.");
    process.exit(1);
  }

  const db = mongoose.connection.db;

  if (!db) throw new Error("Sin base de datos.");

  const first = performance.now();

  await db.admin().ping();
  line("Primera consulta (ping)", `${ms(first)} ms`);

  const pings: number[] = [];

  for (let i = 0; i < 8; i++) {
    const start = performance.now();

    await db.admin().ping();
    pings.push(ms(start));
  }

  line("Ping, 8 seguidos (mediana)", `${median(pings)} ms  (cada ida y vuelta a Atlas)`);

  const reads: number[] = [];

  for (let i = 0; i < 5; i++) {
    const start = performance.now();

    await db.collection("students").findOne({}, { projection: { _id: 1 } });
    reads.push(ms(start));
  }

  line("Leer 1 documento, 5 (mediana)", `${median(reads)} ms`);

  const parallel = performance.now();

  await Promise.all(Array.from({ length: 8 }, () => db.admin().ping()));
  line("8 consultas a la vez", `${ms(parallel)} ms`);

  console.log(
    "\nLectura: el 'Ping' es lo minimo que paga CADA consulta. Si es < 150 ms, una pantalla de 3 a 5 consultas\n" +
      "tarda menos de 1 s por la base. Si la 'Conexion completa' es de varios segundos, pero lo demas es bajo,\n" +
      "el problema es abrir una conexion nueva en cada peticion (typico de `vercel dev`).",
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
