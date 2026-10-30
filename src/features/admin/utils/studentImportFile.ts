import type { StudentImportRow } from "@/types";

/** Las columnas del Excel de carga masiva, en su orden. El archivo adjunto por el cliente es exactamente este formato. */
export const IMPORT_COLUMNS = [
  "NOMBRE",
  "RUT",
  "FECHA_NACIMIENTO",
  "EMAIL",
  "CELULAR",
  "COMUNA",
  "REGION",
  "JORNADA",
  "GENERO",
] as const;

/** Maximo de filas por carga (igual que el servidor). */
export const MAX_IMPORT_ROWS = 600;

type Cell = keyof Omit<StudentImportRow, "row">;

/** Como se puede llamar cada columna en el encabezado, ya sin tildes, en minusculas y con guion bajo. */
const HEADER_ALIASES: Record<string, Cell> = {
  nombre: "nombre",
  nombres: "nombre",
  nombre_completo: "nombre",
  rut: "rut",
  run: "rut",
  fecha_nacimiento: "fechaNacimiento",
  fecha_de_nacimiento: "fechaNacimiento",
  nacimiento: "fechaNacimiento",
  email: "email",
  correo: "email",
  e_mail: "email",
  correo_electronico: "email",
  celular: "celular",
  telefono: "celular",
  fono: "celular",
  comuna: "comuna",
  region: "region",
  jornada: "jornada",
  genero: "genero",
  sexo: "genero",
};

function headerKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * El texto de una celda. Una fecha de Excel se lee con los metodos UTC: la libreria la entrega a medianoche UTC, y
 * con los locales (Chile va 3 o 4 horas atras) el 17/05/2001 saldria como 16/05/2001.
 */
export function cellText(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";

    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");

    return `${value.getUTCFullYear()}-${month}-${day}`;
  }

  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "string") return value.trim();

  return "";
}

export type SheetRows = { ok: true; rows: StudentImportRow[] } | { ok: false; message: string };

/**
 * Las filas de estudiantes de la primera hoja. La primera fila es el encabezado: se necesitan al menos NOMBRE y RUT
 * (las demas columnas son opcionales, en cualquier orden, y las desconocidas se ignoran). Las filas totalmente
 * vacias se saltan; cada fila recuerda su numero en el Excel.
 */
export function rowsFromSheet(data: readonly (readonly unknown[])[]): SheetRows {
  const header = data[0];

  if (!header) return { ok: false, message: "El archivo está vacío." };

  const columnOf = new Map<Cell, number>();

  header.forEach((value, index) => {
    const cell = HEADER_ALIASES[headerKey(cellText(value))];

    if (cell && !columnOf.has(cell)) columnOf.set(cell, index);
  });

  if (!columnOf.has("nombre") || !columnOf.has("rut")) {
    return { ok: false, message: "La primera fila debe tener al menos las columnas NOMBRE y RUT." };
  }

  const rows: StudentImportRow[] = [];

  data.slice(1).forEach((line, index) => {
    const text = (cell: Cell) => cellText(line[columnOf.get(cell) ?? -1]);
    const row: StudentImportRow = {
      row: index + 2,
      nombre: text("nombre"),
      rut: text("rut"),
      fechaNacimiento: text("fechaNacimiento"),
      email: text("email"),
      celular: text("celular"),
      comuna: text("comuna"),
      region: text("region"),
      jornada: text("jornada"),
      genero: text("genero"),
    };

    if (Object.entries(row).some(([key, value]) => key !== "row" && value !== "")) rows.push(row);
  });

  if (rows.length === 0) return { ok: false, message: "El archivo no tiene estudiantes bajo el encabezado." };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, message: `El archivo tiene ${rows.length} filas; el máximo por carga es ${MAX_IMPORT_ROWS}.` };
  }

  return { ok: true, rows };
}

/** Lee la primera hoja de un .xlsx y devuelve sus filas de estudiantes. La libreria se carga solo al usarla. */
export async function readImportFile(file: File): Promise<SheetRows> {
  try {
    const { readSheet } = await import("read-excel-file/universal");

    return rowsFromSheet(await readSheet(file));
  } catch {
    return { ok: false, message: "No se pudo leer el archivo. Debe ser un Excel .xlsx (no .xls ni .csv)." };
  }
}

/** El Excel vacio con el formato de la carga masiva (solo el encabezado). */
export async function importTemplateBlob(): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/universal");

  return writeXlsxFile([IMPORT_COLUMNS.map((value) => ({ value, fontWeight: "bold" as const }))], {
    sheet: "Hoja1",
    columns: IMPORT_COLUMNS.map((name) => ({ width: name === "NOMBRE" ? 40 : name === "EMAIL" ? 32 : 18 })),
    stickyRowsCount: 1,
  }).toBlob();
}
