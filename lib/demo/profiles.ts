import { between, int, makeRng, seedFrom } from "./random.js";

/**
 * Datos de prueba de las fichas: correo, universidad, fecha de nacimiento,
 * paralelo y jornada. Todo sale de la lista de estudiantes y de una semilla
 * fija, asi que correr el script otra vez deja lo mismo.
 */

export const DEMO_EDGE_AGES = { min: 18, max: 42 } as const;

/** Dominio al que se pasa la mitad de la lista (el resto conserva el suyo). */
export const ALT_EMAIL_DOMAIN = "alumno.st.cl";

export type RosterRow = { rut: string; email: string };

export type DemoProfile = {
  rut: string;
  /** Correo final: el de la lista, o el de la lista con el dominio cambiado. */
  email: string;
  university: "uvm" | "santo-tomas";
  birthDate: string;
  studyShift: "day" | "evening";
  paralelo: 1;
  /** No alcanza a desbloquear Mini casos: se queda corto en Seriacion. */
  locked: boolean;
  /** Nivel de Seriacion que no puede pasar nunca (solo si `locked`). */
  lockedAboveLevel: number;
};

/**
 * El sistema admite la ñ en el correo pero no las tildes (lib/email.ts): algunos
 * correos de la lista traen tildes y se escriben sin ellas; la ñ se conserva.
 */
export function cleanEmail(email: string): string {
  return email
    .trim()
    .normalize("NFC")
    .toLowerCase()
    .split("")
    .map((char) => (char === "ñ" ? char : char.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
    .join("");
}

const pad = (n: number) => String(n).padStart(2, "0");

function isoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Misma fecha de calendario `years` anos antes (un 29 de febrero pasa al 28). */
function yearsBefore(now: Date, years: number): Date {
  const year = now.getUTCFullYear() - years;
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const date = new Date(Date.UTC(year, month, day));

  // Date "rueda" el 29 de febrero al 1 de marzo en un ano sin bisiesto.
  return date.getUTCMonth() === month ? date : new Date(Date.UTC(year, month, 28));
}

/**
 * Fecha de nacimiento al azar para que hoy tenga entre 18 y 42 anos. Se deja un
 * margen de 90 dias del lado joven: asi a quien juega semanas atras tampoco le
 * sale menos de 18 en la foto de cada partida.
 */
export function randomBirthDate(rut: string, now: Date): string {
  const rng = makeRng(seedFrom(`${rut}|nacimiento`));
  const youngest = yearsBefore(now, DEMO_EDGE_AGES.min).getTime() - 90 * 86_400_000;
  const oldest = yearsBefore(now, DEMO_EDGE_AGES.max + 1).getTime() + 86_400_000;
  const born = new Date(Math.round(between(rng, oldest, youngest)));

  return isoDate(born);
}

/** Cada cuantos estudiantes uno queda sin poder desbloquear Mini casos. */
export const LOCK_EVERY = 5;
const LOCK_OFFSET = 2;

export function buildProfiles(rows: RosterRow[], now: Date): DemoProfile[] {
  const sorted = [...rows].sort((a, b) => a.rut.localeCompare(b.rut));

  return sorted.map((row, index) => {
    const rng = makeRng(seedFrom(`${row.rut}|ficha`));
    // Los de posicion impar (la mitad de la lista) pasan al otro dominio.
    const alternate = index % 2 === 1;
    const email = cleanEmail(row.email);
    const local = email.split("@")[0] as string;
    const locked = index % LOCK_EVERY === LOCK_OFFSET;

    return {
      rut: row.rut,
      email: alternate ? `${local}@${ALT_EMAIL_DOMAIN}` : email,
      university: alternate ? "santo-tomas" : "uvm",
      birthDate: randomBirthDate(row.rut, now),
      studyShift: rng() < 0.5 ? "day" : "evening",
      paralelo: 1,
      locked,
      lockedAboveLevel: locked ? int(rng, 6, 9) : Infinity,
    };
  });
}
