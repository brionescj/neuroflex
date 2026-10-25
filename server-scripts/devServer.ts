/**
 * Servidor de API para desarrollo local: UN proceso que se queda vivo y atiende todas las
 * peticiones con el mismo router que usa Vercel (lib/router.ts).
 *
 * Por que existe: si cada peticion arranca un proceso nuevo (o `vercel dev` recompila), la
 * conexion a Mongo Atlas se vuelve a abrir cada vez (varios segundos). Aqui se abre una vez
 * y se reutiliza, como hace Vercel con una funcion "caliente". Sirve ademas para saber si la
 * lentitud viene del entorno local o de la base de datos.
 *
 * Uso:   npm run dev:server        (API en http://localhost:3000)
 *        npm run dev               (la pagina en http://localhost:5173; /api se reenvia aqui)
 * Con VITE_API_URL=/api en .env.local, para que la pagina y la API compartan origen (cookies).
 */
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

/** Lee `.env` a mano en versiones de Node que aun no traen process.loadEnvFile (antes de la 20.12). */
function loadEnvByHand(path: string): void {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);

    if (!match || line.trimStart().startsWith("#")) continue;

    const key = match[1] as string;
    const value = (match[2] as string).replace(/^(["'])(.*)\1$/, "$2");

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// .env.local manda sobre .env (ninguno pisa una variable que ya venga del entorno).
for (const file of [".env.local", ".env"]) {
  try {
    if (typeof process.loadEnvFile === "function") process.loadEnvFile(file);
    else loadEnvByHand(file);
  } catch {
    // Ese archivo no existe: se prueba el siguiente o se usan las variables del entorno.
  }
}

const PORT = Number(process.env.PORT ?? 3000);

// Despues de leer .env: lib/db.ts y lib/jwt.ts exigen sus variables al cargarse.
const { dispatch } = await import("../lib/router");
const { connectDB } = await import("../lib/db");

type DevRequest = IncomingMessage & { body?: unknown; query?: Record<string, string | string[]> };
type DevResponse = ServerResponse & {
  status: (code: number) => DevResponse;
  json: (payload: unknown) => DevResponse;
};

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) chunks.push(chunk as Buffer);

  if (chunks.length === 0) return undefined;

  const text = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function queryOf(url: URL): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};

  for (const [key, value] of url.searchParams) {
    const current = query[key];

    if (current === undefined) query[key] = value;
    else query[key] = Array.isArray(current) ? [...current, value] : [current, value];
  }

  return query;
}

const server = createServer(async (incoming, outgoing) => {
  const req = incoming as DevRequest;
  const res = outgoing as DevResponse;
  const startedAt = performance.now();

  res.status = (code) => {
    res.statusCode = code;

    return res;
  };
  res.json = (payload) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));

    return res;
  };

  res.on("finish", () => {
    const ms = Math.round(performance.now() - startedAt);

    process.stdout.write(`${res.statusCode} ${req.method} ${req.url} ${ms} ms  ${String(res.getHeader("Server-Timing") ?? "")}\n`);
  });

  try {
    const url = new URL(req.url ?? "/", "http://localhost");

    req.query = queryOf(url);
    req.body = await readBody(req);

    await dispatch(req as never, res as never);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);

    if (!res.headersSent) res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

server.listen(PORT, () => {
  process.stdout.write(`API de desarrollo en http://localhost:${PORT}/api\n`);

  // Abre la conexion a la base desde ya: la primera peticion no la paga.
  const startedAt = performance.now();

  connectDB()
    .then(() => process.stdout.write(`Base de datos conectada en ${Math.round(performance.now() - startedAt)} ms\n`))
    .catch((error: unknown) => process.stderr.write(`No se pudo conectar a la base de datos: ${String(error)}\n`));
});
