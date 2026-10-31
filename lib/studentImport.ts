import { normalizeCommune } from "./communes.js";
import { parsePersonName } from "./personName.js";
import { normalizeRegion, plainText, REGIONS } from "./region.js";
import { normalizeForDatabase, isValidRut } from "./rut.js";
import { parseStudentDetails } from "./studentFields.js";

/**
 * Carga masiva de estudiantes desde Excel. El archivo trae NOMBRE, RUT, FECHA_NACIMIENTO, EMAIL, CELULAR, COMUNA,
 * REGION, JORNADA y GENERO; la universidad y el paralelo se eligen una vez para todo el archivo. Aqui vive TODA la
 * interpretacion (el navegador solo lee las celdas), para que haya una sola regla y el servidor sea la autoridad.
 *
 * Criterio: lo obligatorio es el RUT y el nombre completo (la ficha exige apellido paterno, materno y nombres). Todo
 * lo demas es opcional: si falta no se rellena y si no se entiende tampoco, pero se avisa para no perderlo en silencio.
 */

/** Maximo de filas por carga: cabe de sobra en el limite de tamano de una funcion de Vercel. */
export const MAX_IMPORT_ROWS = 600;

export type ImportRowInput = {
  /** Numero de fila en el Excel (la 1 es el encabezado), para decirle al administrador donde esta el problema. */
  row: number;
  nombre: string;
  rut: string;
  fechaNacimiento: string;
  email: string;
  celular: string;
  comuna: string;
  region: string;
  jornada: string;
  genero: string;
};

/** Particulas que, junto con la palabra que sigue, forman un apellido compuesto («De La Fuente», «Del Río»). */
const PARTICLES = new Set(["de", "del", "la", "las", "los", "lo", "el", "san", "santa", "da", "di", "du", "van", "von", "der", "den", "le"]);

const isParticle = (word: string) => PARTICLES.has(plainText(word));

/**
 * Agrupa las palabras en «unidades»: una palabra suelta o una o mas particulas seguidas de la palabra que las cierra
 * («de la Fuente»). Si el texto termina en una particula, queda como unidad incompleta (null).
 */
function toUnits(words: string[]): string[][] | null {
  const units: string[][] = [];
  let pending: string[] = [];

  for (const word of words) {
    pending.push(word);

    if (!isParticle(word)) {
      units.push(pending);
      pending = [];
    }
  }

  return pending.length > 0 ? null : units;
}

export type SplitName = { paternalLastName: string; maternalLastName: string; firstName: string };

/**
 * «Apellido_Paterno Apellido_Materno Nombres» (1, 2 o 3 nombres). Un apellido puede ser compuesto: «De La Fuente»,
 * «Del Río», «San Martín». Devuelve el motivo si no se puede separar con seguridad.
 */
export function splitFullName(full: string): { ok: true; value: SplitName } | { ok: false; message: string } {
  const words = full.trim().split(/\s+/).filter(Boolean);
  const units = toUnits(words);

  if (words.length === 0) return { ok: false, message: "Falta el nombre." };
  if (!units) return { ok: false, message: "El nombre termina en «de», «del», «la»…: falta la palabra que sigue." };

  // Dos apellidos y al menos un nombre.
  if (units.length < 3) {
    return {
      ok: false,
      message: "No se pudo separar el nombre: se necesita apellido paterno, apellido materno y al menos un nombre.",
    };
  }

  const nameUnits = units.slice(2);

  if (nameUnits.length > 3) {
    return { ok: false, message: "El nombre tiene más de 3 nombres o apellidos de más: revísalo." };
  }

  const join = (list: string[][]) => list.map((unit) => unit.join(" ")).join(" ");

  const paternal = parsePersonName("El apellido paterno", join([units[0] as string[]]));
  const maternal = parsePersonName("El apellido materno", join([units[1] as string[]]));
  const first = parsePersonName("Los nombres", join(nameUnits));

  for (const part of [paternal, maternal, first]) {
    if (!part.ok) return part;
  }

  return {
    ok: true,
    value: {
      paternalLastName: (paternal as { value: string }).value,
      maternalLastName: (maternal as { value: string }).value,
      firstName: (first as { value: string }).value,
    },
  };
}

/** Dias desde 1899-12-30 (el origen de las fechas de Excel) a una fecha AAAA-MM-DD. */
function fromExcelSerial(serial: number): string {
  const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);

  return date.toISOString().slice(0, 10);
}

const pad = (n: string) => n.padStart(2, "0");

/**
 * La fecha como AAAA-MM-DD a partir de lo que suele traer un Excel: AAAA-MM-DD, DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA o
 * el numero de serie de Excel. Null si no se entiende (el año de dos cifras se rechaza: es ambiguo).
 */
export function normalizeImportedDate(raw: string): string | null {
  const text = raw.trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);

  if (iso) return `${iso[1]}-${pad(iso[2] as string)}-${pad(iso[3] as string)}`;

  const latin = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);

  if (latin) return `${latin[3]}-${pad(latin[2] as string)}-${pad(latin[1] as string)}`;

  if (/^\d{4,6}(\.0+)?$/.test(text)) return fromExcelSerial(Number(text));

  return null;
}

/** «Diurna» / «Vespertina» y sus formas cortas. */
function shiftValue(raw: string): string | null {
  const key = plainText(raw);

  if (/^(d|dia|diurn[oa]?)$/.test(key)) return "day";
  if (/^(v|vesp|vespertin[oa]?|tarde|noche|nocturn[oa]?)$/.test(key)) return "evening";

  return null;
}

/** Los valores de la ficha: female, male, other, undisclosed. */
function genderValue(raw: string): string | null {
  const key = plainText(raw);

  if (/^(f|femenino|femenina|mujer|female)$/.test(key)) return "female";
  if (/^(m|masculino|hombre|varon|male)$/.test(key)) return "male";
  if (/^(otro|otra|other|no binario|no binaria)$/.test(key)) return "other";
  if (/^(no informa|no informado|no responde|prefiero no decir|prefiere no decir|undisclosed)$/.test(key)) {
    return "undisclosed";
  }

  return null;
}

/** La region a la que pertenece una comuna, si es una sola (los nombres oficiales no se repiten entre regiones). */
function regionOfCommune(text: string): string | null {
  const found = REGIONS.filter((region) => normalizeCommune(region, text) !== null);

  return found.length === 1 ? (found[0] as string) : null;
}

export type ParsedImportRow =
  | {
      ok: true;
      rut: string;
      name: string;
      /** Campos de la ficha ya validados y con su valor oficial. */
      set: Record<string, string>;
      /** Datos opcionales que no se entendieron y se dejaron sin rellenar. */
      warnings: string[];
    }
  | { ok: false; rut?: string; name?: string; message: string };

/** Una fila del Excel convertida en los datos de una ficha, o el motivo por el que no se puede cargar. */
export function parseImportRow(input: ImportRowInput, now: Date = new Date()): ParsedImportRow {
  const rutText = input.rut.trim();

  if (rutText === "") return { ok: false, message: "Falta el RUT." };

  const rut = normalizeForDatabase(rutText);

  if (!isValidRut(rut)) return { ok: false, rut: rutText, message: "El RUT no es válido." };

  const split = splitFullName(input.nombre);

  if (!split.ok) return { ok: false, rut, message: split.message };

  const { firstName, paternalLastName, maternalLastName } = split.value;
  const name = `${firstName} ${paternalLastName} ${maternalLastName}`;
  const set: Record<string, string> = { firstName, paternalLastName, maternalLastName };
  const warnings: string[] = [];

  /** Guarda el campo si la ficha lo acepta; si no, lo deja sin rellenar y avisa. */
  function keep(field: string, value: string, label: string) {
    const parsed = parseStudentDetails({ [field]: value }, { now, requireChanges: false });

    if (parsed.ok) {
      set[field] = (parsed.set as Record<string, string>)[field] as string;
    } else {
      warnings.push(`${label}: ${parsed.message}`);
    }
  }

  const email = input.email.trim();
  const celular = input.celular.trim();
  const birth = input.fechaNacimiento.trim();
  const shift = input.jornada.trim();
  const gender = input.genero.trim();
  const regionText = input.region.trim();
  const communeText = input.comuna.trim();

  if (email) keep("email", email, "Correo");
  if (celular) keep("celular", celular, "Celular");

  if (birth) {
    const iso = normalizeImportedDate(birth);

    if (iso) keep("birthDate", iso, "Fecha de nacimiento");
    else warnings.push(`Fecha de nacimiento: «${birth}» no se entiende (usa DD/MM/AAAA).`);
  }

  if (shift) {
    const value = shiftValue(shift);

    if (value) keep("studyShift", value, "Jornada");
    else warnings.push(`Jornada: «${shift}» no es Diurna ni Vespertina.`);
  }

  if (gender) {
    const value = genderValue(gender);

    if (value) keep("gender", value, "Género");
    else warnings.push(`Género: «${gender}» no se reconoce.`);
  }

  // Region y comuna van juntas: la comuna debe ser de la region. Sin region, se deduce de la comuna si es unica.
  let region: string | null = regionText ? normalizeRegion(regionText) : null;

  if (regionText && !region) warnings.push(`Región: «${regionText}» no es una región de Chile.`);

  if (communeText) {
    const inferred = region ?? regionOfCommune(communeText);

    if (!inferred) {
      warnings.push(`Comuna: «${communeText}» no es una comuna de Chile.`);
    } else if (!normalizeCommune(inferred, communeText)) {
      const actual = regionOfCommune(communeText);

      // Desde 2018 las comunas de Ñuble ya no son del Biobio, pero muchas fichas siguen diciendolo: la comuna manda.
      if (inferred === "Biobío" && actual === "Ñuble") {
        region = actual;
        set.comuna = normalizeCommune(actual, communeText) as string;
      } else {
        warnings.push(
          `Comuna: «${communeText}» no pertenece a la región ${inferred}${actual ? ` (es de ${actual})` : ""}.`,
        );
      }
    } else {
      region = inferred;
      set.comuna = normalizeCommune(inferred, communeText) as string;
    }
  }

  if (region) set.region = region;

  return { ok: true, rut, name, set, warnings };
}
