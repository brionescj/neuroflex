import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as "student" | "admin",
  authorized: true as boolean,
  existing: [] as string[],
  inserted: [] as Record<string, unknown>[],
  insertFails: false as boolean,
  connects: 0,
}));

vi.mock("./auth", () => ({
  requireAuth: (
    _req: unknown,
    res: { status: (n: number) => { json: (b: unknown) => void } },
    roles?: string[],
  ) => {
    if (!mocks.authorized) {
      res.status(401).json({ success: false, message: "No autenticado." });
      return null;
    }

    if (roles && !roles.includes(mocks.role)) {
      res.status(403).json({ success: false, message: "No autorizado." });
      return null;
    }

    return { rut: "99999999-9", role: mocks.role };
  },
}));

vi.mock("./db", () => ({
  connectDB: async () => {
    mocks.connects += 1;
  },
}));

vi.mock("./models/Student", () => ({
  Student: {
    find: (filter: { rut: { $in: string[] } }) => ({
      select: () => ({
        lean: async () => {
          const saved = new Set([...mocks.existing, ...mocks.inserted.map((doc) => doc.rut as string)]);

          return filter.rut.$in.filter((rut) => saved.has(rut)).map((rut) => ({ rut }));
        },
      }),
    }),
    insertMany: async (docs: Record<string, unknown>[]) => {
      if (mocks.insertFails) {
        // Solo la primera ficha alcanza a guardarse.
        mocks.inserted.push(docs[0] as Record<string, unknown>);
        throw new Error("fallo parcial");
      }

      mocks.inserted.push(...docs);
    },
  },
}));

import handler from "./handlers/admin/studentsImport";

const cells = (extra: Record<string, unknown> = {}) => ({
  nombre: "Pérez Soto Juan",
  rut: "12.345.678-5",
  fechaNacimiento: "",
  email: "",
  celular: "",
  comuna: "",
  region: "",
  jornada: "",
  genero: "",
  ...extra,
});

const OK_ROWS = [
  { row: 2, ...cells() },
  { row: 3, ...cells({ nombre: "De La Fuente Soto Ana María", rut: "11.111.111-1", comuna: "Temuco", jornada: "Diurna" }) },
];

function run(body: unknown, method = "POST") {
  let status = 0;
  let json: Record<string, unknown> = {};

  const res = {
    status(code: number) {
      status = code;

      return this;
    },
    json(payload: Record<string, unknown>) {
      json = payload;

      return this;
    },
  } as unknown as VercelResponse;

  return handler({ method, body, query: {}, headers: {} } as unknown as VercelRequest, res).then(() => ({ status, json }));
}

const data = (out: { json: Record<string, unknown> }) =>
  out.json.data as {
    dryRun: boolean;
    results: { row: number; status: string; rut?: string; name?: string; message?: string; warnings: string[] }[];
    summary: Record<string, number>;
  };

beforeEach(() => {
  mocks.role = "admin";
  mocks.authorized = true;
  mocks.existing = [];
  mocks.inserted = [];
  mocks.insertFails = false;
  mocks.connects = 0;
});

describe("POST admin/students/import", () => {
  it("revisar el archivo (dryRun) muestra qué se cargaría y no guarda nada", async () => {
    const out = await run({ paralelo: 2, rows: OK_ROWS });

    expect(out.status).toBe(200);
    expect(data(out).dryRun).toBe(true);
    expect(data(out).summary).toMatchObject({ total: 2, ready: 2, created: 0, exists: 0, errors: 0 });
    expect(data(out).results[1]).toMatchObject({ row: 3, status: "ready", name: "Ana María De La Fuente Soto" });
    expect(mocks.inserted).toHaveLength(0);
  });

  it("al confirmar crea las fichas con el paralelo y la universidad elegidos, y los datos del archivo", async () => {
    const out = await run({ paralelo: 3, university: "uvm", dryRun: false, rows: OK_ROWS });

    expect(out.status).toBe(201);
    expect(data(out).summary).toMatchObject({ created: 2, ready: 0, errors: 0 });
    expect(mocks.inserted[0]).toEqual({
      rut: "12345678-5",
      paralelo: 3,
      university: "uvm",
      firstName: "Juan",
      paternalLastName: "Pérez",
      maternalLastName: "Soto",
    });
    expect(mocks.inserted[1]).toMatchObject({
      rut: "11111111-1",
      paternalLastName: "De La Fuente",
      firstName: "Ana María",
      region: "La Araucanía",
      comuna: "Temuco",
      studyShift: "day",
    });
  });

  it("sin universidad elegida no se guarda ninguna (queda «Seleccionar»)", async () => {
    await run({ paralelo: 1, dryRun: false, rows: [OK_ROWS[0]] });

    expect(mocks.inserted[0]).not.toHaveProperty("university");
  });

  it("una fila mala no frena a las demás; los RUT que ya existen o se repiten se informan", async () => {
    mocks.existing = ["11111111-1"];

    const out = await run({
      paralelo: 2,
      dryRun: false,
      rows: [
        ...OK_ROWS,
        { row: 4, ...cells({ rut: "12-345", nombre: "Pérez Soto Luis" }) },
        { row: 5, ...cells({ nombre: "Pérez Soto Juan Pablo" }) },
        { row: 6, ...cells({ nombre: "Solo Dos", rut: "22.222.222-2" }) },
      ],
    });

    const byRow = Object.fromEntries(data(out).results.map((result) => [result.row, result]));

    expect(byRow[2]?.status).toBe("created");
    expect(byRow[3]).toMatchObject({ status: "exists", message: "Ya existe un estudiante con ese RUT." });
    expect(byRow[4]).toMatchObject({ status: "error", message: "El RUT no es válido." });
    expect(byRow[5]).toMatchObject({ status: "error", message: expect.stringMatching(/repetido.*fila 2/) });
    expect(byRow[6]?.status).toBe("error");
    expect(data(out).summary).toMatchObject({ total: 5, created: 1, exists: 1, errors: 3 });
    expect(mocks.inserted).toHaveLength(1);
  });

  it("los avisos de datos opcionales no se cargaron viajan con la fila", async () => {
    const out = await run({ paralelo: 2, rows: [{ row: 2, ...cells({ email: "mal", genero: "?" }) }] });

    expect(data(out).results[0]?.status).toBe("ready");
    expect(data(out).results[0]?.warnings).toHaveLength(2);
    expect(data(out).summary.withWarnings).toBe(1);
  });

  it("si el guardado falla a medias, informa cuáles quedaron guardadas", async () => {
    mocks.insertFails = true;

    const out = await run({ paralelo: 2, dryRun: false, rows: OK_ROWS });
    const statuses = data(out).results.map((result) => result.status);

    expect(statuses).toEqual(["created", "error"]);
  });

  it("exige paralelo, universidad válida y filas dentro del máximo", async () => {
    expect((await run({ rows: OK_ROWS })).status).toBe(400);
    expect((await run({ paralelo: 9, rows: OK_ROWS })).status).toBe(400);
    expect((await run({ paralelo: 2, university: "otra", rows: OK_ROWS })).status).toBe(400);
    expect((await run({ paralelo: 2, rows: [] })).status).toBe(400);

    const tooMany = await run({ paralelo: 2, rows: Array.from({ length: 601 }, (_, i) => ({ row: i + 2, ...cells() })) });

    expect(tooMany.status).toBe(400);
    expect(tooMany.json.message).toMatch(/máximo por carga es 600/);
    expect(mocks.connects).toBe(0);
  });

  it("solo el administrador y solo POST", async () => {
    mocks.authorized = false;
    expect((await run({ paralelo: 2, rows: OK_ROWS })).status).toBe(401);

    mocks.authorized = true;
    mocks.role = "student";
    expect((await run({ paralelo: 2, rows: OK_ROWS })).status).toBe(403);

    mocks.role = "admin";
    expect((await run({}, "GET")).status).toBe(405);
    expect(mocks.inserted).toHaveLength(0);
  });
});
