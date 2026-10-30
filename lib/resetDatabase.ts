import { parseNameChanges } from "./personName";
import { isValidRut, normalizeForDatabase } from "./rut";
import { parseStudentDetails } from "./studentFields";
import { validatePasswordStrength } from "./password";

/**
 * Nucleo del script server-scripts/resetDatabase.ts: deja la base «en limpio» para salir a produccion, con solo la
 * cuenta del administrador y la de un estudiante de prueba. Separado del script para poder probarlo sin una base real.
 */

/**
 * Colecciones que NO se vacian por defecto: no son datos de prueba sino contenido del sistema.
 *  - minicases: el banco de casos del juego (los 25 base mas lo que el administrador haya editado o agregado).
 *  - migrations: marcas de tareas de arranque ya hechas; sin ellas se repetirian.
 */
export const KEEP_COLLECTIONS = ["minicases", "migrations"] as const;

/** Las cuentas con que queda la base. */
const ADMIN_INPUT = {
  firstName: "Camilo Jaime",
  paternalLastName: "Briones",
  maternalLastName: "Quezada",
  rut: "18.299.618-1",
  email: "brionescamiloj@gmail.com",
};

const STUDENT_INPUT = {
  firstName: "Estudiante",
  paternalLastName: "de Prueba",
  maternalLastName: "Neuroflex",
  rut: "99.999.999-9",
  email: "estudiante@neuroflex.cl",
  celular: "99999999",
  gender: "undisclosed",
  studyShift: "day",
  birthDate: "2000-01-01",
  university: "uvm",
  region: "Valparaíso",
  comuna: "Viña del Mar",
};

export type SeedAccounts = {
  admin: { profile: Record<string, unknown>; account: { rut: string; role: "admin"; enabled: true } };
  student: { profile: Record<string, unknown>; account: { rut: string; role: "student"; enabled: true } };
};

/**
 * Las fichas y cuentas (sin contrasena) que se dejan, pasadas por las mismas validaciones que usa el sistema al
 * crearlas: si algo no cumple las reglas, lanza el error en vez de escribir un dato que la aplicacion rechazaria.
 */
export function buildSeedAccounts(now: Date = new Date()): SeedAccounts {
  const adminRut = normalizeForDatabase(ADMIN_INPUT.rut);
  const studentRut = normalizeForDatabase(STUDENT_INPUT.rut);

  for (const rut of [adminRut, studentRut]) {
    if (!isValidRut(rut)) throw new Error(`El RUT ${rut} no es valido.`);
  }

  const adminNames = parseNameChanges(ADMIN_INPUT);

  if (!adminNames.ok) throw new Error(adminNames.message);

  const adminEmail = parseStudentDetails({ email: ADMIN_INPUT.email }, { now });

  if (!adminEmail.ok) throw new Error(adminEmail.message);

  const { rut: _rut, ...studentFields } = STUDENT_INPUT;
  const student = parseStudentDetails(studentFields, { now });

  if (!student.ok) throw new Error(student.message);

  return {
    admin: {
      profile: { rut: adminRut, ...adminNames.set, email: adminEmail.set.email, enabled: true, avatarId: "panda" },
      account: { rut: adminRut, role: "admin", enabled: true },
    },
    student: {
      profile: {
        rut: studentRut,
        ...student.set,
        paralelo: 1,
        entryYear: now.getFullYear(),
        enabled: true,
        registered: true,
        avatarId: "cat",
        isDeleted: false,
      },
      account: { rut: studentRut, role: "student", enabled: true },
    },
  };
}

/** Una contrasena elegida por quien ejecuta el script: debe cumplir las reglas del sistema. */
export function checkPassword(label: string, password: string): void {
  const problem = validatePasswordStrength(password);

  if (problem) throw new Error(`${label}: ${problem}`);
}

type Doc = Record<string, unknown>;

/** Lo minimo que se usa de la base (la `Db` de mongoose lo cumple). */
export type DbLike = {
  listCollections: () => { toArray: () => Promise<{ name: string }[]> };
  collection: (name: string) => {
    find: () => { toArray: () => Promise<Doc[]> };
    deleteMany: (filter: Record<string, unknown>) => Promise<{ deletedCount: number }>;
    insertMany: (docs: Doc[]) => Promise<unknown>;
  };
};

export type ResetOptions = {
  apply: boolean;
  /** Vaciar tambien el banco de mini casos (el servidor vuelve a cargar los 25 base al arrancar). */
  includeMiniCases: boolean;
  /** Fichas y cuentas con que queda la base; `password` ya viene con su hash. */
  seed: { collection: string; docs: Doc[] }[];
  /** Se llama con todo lo que se va a borrar, ANTES de borrar. Si lanza un error, no se borra nada. */
  backup: (contents: Record<string, Doc[]>) => void;
};

export type ResetResult = {
  applied: boolean;
  /** Cuantos documentos hay (o habia) en cada coleccion que se vacia. */
  cleared: { name: string; count: number }[];
  kept: { name: string; count: number }[];
};

/** Cuales colecciones se vacian y cuales se conservan. Las internas de MongoDB («system.*») nunca se tocan. */
export function splitCollections(names: string[], includeMiniCases: boolean): { clear: string[]; keep: string[] } {
  const keepList = new Set<string>(includeMiniCases ? ["migrations"] : KEEP_COLLECTIONS);
  const user = names.filter((name) => !name.startsWith("system.")).sort();

  return { clear: user.filter((name) => !keepList.has(name)), keep: user.filter((name) => keepList.has(name)) };
}

/**
 * Vacia todas las colecciones (salvo las que se conservan) y deja las fichas y cuentas indicadas. Sin `apply`, solo
 * cuenta. Las colecciones y sus indices se conservan: se borran documentos, no se eliminan colecciones.
 */
export async function resetDatabase(db: DbLike, options: ResetOptions): Promise<ResetResult> {
  const names = (await db.listCollections().toArray()).map((c) => c.name);
  const { clear, keep } = splitCollections(names, options.includeMiniCases);

  const contents: Record<string, Doc[]> = {};

  for (const name of clear) contents[name] = await db.collection(name).find().toArray();

  const counted = (list: string[]) => Promise.all(list.map(async (name) => ({ name, count: (await db.collection(name).find().toArray()).length })));
  const cleared = clear.map((name) => ({ name, count: (contents[name] as Doc[]).length }));
  const kept = await counted(keep);

  if (!options.apply) return { applied: false, cleared, kept };

  options.backup(contents);

  for (const name of clear) await db.collection(name).deleteMany({});

  for (const { collection, docs } of options.seed) await db.collection(collection).insertMany(docs);

  return { applied: true, cleared, kept };
}
