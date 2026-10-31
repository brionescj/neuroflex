import type { VercelRequest, VercelResponse } from "@vercel/node";
import { connectDB } from "../../db.js";
import { requireAuth } from "../../auth.js";
import { Student } from "../../models/Student.js";
import { isParalelo, UNIVERSITIES } from "../../studentFields.js";
import { MAX_IMPORT_ROWS, parseImportRow, type ImportRowInput } from "../../studentImport.js";

/** Lo que pasa con cada fila del Excel. */
export type ImportRowStatus = "ready" | "created" | "exists" | "error";

export type ImportRowResult = {
  row: number;
  status: ImportRowStatus;
  rut?: string;
  name?: string;
  /** Por que no se puede cargar (exists / error). */
  message?: string;
  /** Datos opcionales que no se entendieron y quedaron sin rellenar. */
  warnings: string[];
};

const MAX_CELL = 200;

const CELLS = ["nombre", "rut", "fechaNacimiento", "email", "celular", "comuna", "region", "jornada", "genero"] as const;

function cleanRows(raw: unknown): ImportRowInput[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return "El archivo no trae filas con datos.";
  if (raw.length > MAX_IMPORT_ROWS) return `El archivo tiene ${raw.length} filas; el máximo por carga es ${MAX_IMPORT_ROWS}.`;

  const rows: ImportRowInput[] = [];

  for (const item of raw) {
    const source = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const row: Record<string, unknown> = { row: Number.isInteger(source.row) ? source.row : rows.length + 2 };

    for (const cell of CELLS) {
      const value = source[cell];

      if (value !== undefined && value !== null && typeof value !== "string") return "Una celda del archivo no es texto.";

      const text = (value ?? "") as string;

      if (text.length > MAX_CELL) return `La fila ${row.row} tiene una celda demasiado larga.`;

      row[cell] = text;
    }

    rows.push(row as ImportRowInput);
  }

  return rows;
}

/**
 * Carga masiva de estudiantes desde Excel. Con `dryRun` solo revisa el archivo (el administrador ve que se va a cargar
 * antes de confirmar); sin el, crea las fichas validas. Una fila con problemas no frena a las demas.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = requireAuth(req, res, ["admin"]);
  if (!payload) return;

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Metodo no permitido." });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const paralelo = Number(body.paralelo);

  if (!isParalelo(paralelo)) {
    return res.status(400).json({ success: false, message: "Elige el paralelo de los estudiantes del archivo." });
  }

  const university = typeof body.university === "string" && body.university !== "" ? body.university : undefined;

  if (university && !(UNIVERSITIES as readonly string[]).includes(university)) {
    return res.status(400).json({ success: false, message: "La universidad indicada no es válida." });
  }

  const rows = cleanRows(body.rows);

  if (typeof rows === "string") return res.status(400).json({ success: false, message: rows });

  const dryRun = body.dryRun !== false;
  const now = new Date();

  const results: ImportRowResult[] = [];
  const toCreate: { result: ImportRowResult; doc: Record<string, unknown> }[] = [];
  const firstRowOfRut = new Map<string, number>();

  for (const input of rows) {
    const parsed = parseImportRow(input, now);

    if (!parsed.ok) {
      results.push({
        row: input.row,
        status: "error",
        ...(parsed.rut ? { rut: parsed.rut } : {}),
        message: parsed.message,
        warnings: [],
      });
      continue;
    }

    const earlier = firstRowOfRut.get(parsed.rut);

    if (earlier !== undefined) {
      results.push({
        row: input.row,
        status: "error",
        rut: parsed.rut,
        name: parsed.name,
        message: `El RUT está repetido en el archivo (también en la fila ${earlier}).`,
        warnings: [],
      });
      continue;
    }

    firstRowOfRut.set(parsed.rut, input.row);

    const result: ImportRowResult = { row: input.row, status: "ready", rut: parsed.rut, name: parsed.name, warnings: parsed.warnings };

    results.push(result);
    toCreate.push({
      result,
      doc: { rut: parsed.rut, paralelo, ...(university ? { university } : {}), ...parsed.set },
    });
  }

  await connectDB();

  if (toCreate.length > 0) {
    const existing = await Student.find({ rut: { $in: toCreate.map((item) => item.doc.rut) } })
      .select("rut")
      .lean();
    const taken = new Set((existing as { rut: string }[]).map((student) => student.rut));

    for (const item of toCreate) {
      if (taken.has(item.doc.rut as string)) {
        item.result.status = "exists";
        item.result.message = "Ya existe un estudiante con ese RUT.";
      }
    }
  }

  const ready = toCreate.filter((item) => item.result.status === "ready");

  if (!dryRun && ready.length > 0) {
    try {
      await Student.insertMany(
        ready.map((item) => item.doc),
        { ordered: false },
      );

      for (const item of ready) item.result.status = "created";
    } catch {
      // Alguna ficha no se pudo crear (por ejemplo, otro administrador cargo ese RUT justo ahora): se revisa cuales quedaron.
      const saved = await Student.find({ rut: { $in: ready.map((item) => item.doc.rut) } })
        .select("rut")
        .lean();
      const savedRuts = new Set((saved as { rut: string }[]).map((student) => student.rut));

      for (const item of ready) {
        if (savedRuts.has(item.doc.rut as string)) {
          item.result.status = "created";
        } else {
          item.result.status = "error";
          item.result.message = "No se pudo guardar esta ficha.";
        }
      }
    }
  }

  const count = (status: ImportRowStatus) => results.filter((result) => result.status === status).length;

  return res.status(dryRun ? 200 : 201).json({
    success: true,
    message: dryRun ? "Archivo revisado." : "Carga terminada.",
    data: {
      dryRun,
      results,
      summary: {
        total: results.length,
        ready: count("ready"),
        created: count("created"),
        exists: count("exists"),
        errors: count("error"),
        withWarnings: results.filter((result) => result.warnings.length > 0).length,
      },
    },
  });
}
