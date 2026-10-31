/**
 * Las 16 regiones de Chile, de norte a sur, tal como se guardan en la ficha del
 * estudiante. Copia de src/config/studentOptions.ts (REGION_OPTIONS): un test
 * comprueba que coincidan, porque el servidor no comparte codigo con el
 * navegador. src/utils/region.ts repite normalizeRegion, con los mismos casos
 * de prueba.
 */
export const REGIONS = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "Libertador General Bernardo O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén del General Carlos Ibáñez del Campo",
  "Magallanes y de la Antártica Chilena",
] as const;

export type Region = (typeof REGIONS)[number];

/** Sin tildes (la ñ se conserva como n), en minusculas y solo letras, numeros y espacios. */
export function plainText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Formas cortas o antiguas con las que se ha escrito cada region. */
const ALIASES: Record<string, Region> = {
  arica: "Arica y Parinacota",
  parinacota: "Arica y Parinacota",
  rm: "Metropolitana de Santiago",
  santiago: "Metropolitana de Santiago",
  metropolitana: "Metropolitana de Santiago",
  "metropolitana de santiago": "Metropolitana de Santiago",
  ohiggins: "Libertador General Bernardo O'Higgins",
  "o higgins": "Libertador General Bernardo O'Higgins",
  libertador: "Libertador General Bernardo O'Higgins",
  "bernardo o higgins": "Libertador General Bernardo O'Higgins",
  "bio bio": "Biobío",
  araucania: "La Araucanía",
  "la araucania": "La Araucanía",
  aysen: "Aysén del General Carlos Ibáñez del Campo",
  magallanes: "Magallanes y de la Antártica Chilena",
  "magallanes y antartica chilena": "Magallanes y de la Antártica Chilena",
};

const BY_KEY = new Map<string, Region>([
  ...REGIONS.map((region) => [plainText(region), region] as const),
  ...Object.entries(ALIASES).map(([key, region]) => [plainText(key), region] as const),
]);

/** Palabras que no distinguen una region de otra ("Región de la Araucanía", "Magallanes y Antártica"). */
const FILLER = new Set(["region", "reg", "de", "del", "la", "las", "los", "el", "y", "e"]);

/** Abreviaturas frecuentes, ya sin puntos ni tildes ("Gral.", "B.", "Bdo."). */
const EXPANSIONS: Record<string, string> = {
  gral: "general",
  grl: "general",
  gen: "general",
  b: "bernardo",
  c: "carlos",
  h: "higgins",
  stgo: "santiago",
  sgo: "santiago",
  bdo: "bernardo",
  bno: "bernardo",
  bernd: "bernardo",
  lib: "libertador",
  metrop: "metropolitana",
  valpo: "valparaiso",
};

/**
 * Las palabras de cada region. `words` son todas las que puede traer su nombre; `keys` las que la distinguen
 * (con "general" o "carlos" solas no se sabe de cual se habla).
 */
const PROFILES: { region: Region; words: string[]; keys: string[] }[] = [
  { region: "Arica y Parinacota", words: ["arica", "parinacota"], keys: ["arica", "parinacota"] },
  { region: "Tarapacá", words: ["tarapaca"], keys: ["tarapaca"] },
  { region: "Antofagasta", words: ["antofagasta"], keys: ["antofagasta"] },
  { region: "Atacama", words: ["atacama"], keys: ["atacama"] },
  { region: "Coquimbo", words: ["coquimbo"], keys: ["coquimbo"] },
  { region: "Valparaíso", words: ["valparaiso"], keys: ["valparaiso"] },
  {
    region: "Metropolitana de Santiago",
    words: ["metropolitana", "santiago", "rm"],
    keys: ["metropolitana", "santiago", "rm"],
  },
  {
    region: "Libertador General Bernardo O'Higgins",
    words: ["libertador", "general", "bernardo", "o", "higgins", "ohiggins"],
    keys: ["libertador", "bernardo", "higgins", "ohiggins"],
  },
  { region: "Maule", words: ["maule"], keys: ["maule"] },
  { region: "Ñuble", words: ["nuble"], keys: ["nuble"] },
  { region: "Biobío", words: ["bio", "biobio"], keys: ["bio", "biobio"] },
  { region: "La Araucanía", words: ["araucania"], keys: ["araucania"] },
  { region: "Los Ríos", words: ["rios"], keys: ["rios"] },
  { region: "Los Lagos", words: ["lagos"], keys: ["lagos"] },
  {
    region: "Aysén del General Carlos Ibáñez del Campo",
    words: ["aysen", "general", "carlos", "ibanez", "campo"],
    keys: ["aysen", "ibanez"],
  },
  {
    region: "Magallanes y de la Antártica Chilena",
    words: ["magallanes", "antartica", "chilena"],
    keys: ["magallanes", "antartica"],
  },
];

const ROMAN: Record<string, number> = { i: 1, v: 5, x: 10 };

/** El numero de una region escrito como "VIII" o "8", o null si la palabra no es un numero de region. */
function regionNumber(word: string): number | null {
  if (/^\d{1,2}$/.test(word)) return Number(word);
  if (!/^[ivx]+$/.test(word)) return null;

  let total = 0;

  for (let i = 0; i < word.length; i += 1) {
    const value = ROMAN[word[i] as string] as number;
    const next = ROMAN[word[i + 1] as string] ?? 0;

    total += value < next ? -value : value;
  }

  return total;
}

/** Numeracion oficial de las regiones (la de Ñuble, XVI, es de 2018; la de Arica y Parinacota, XV). */
const BY_NUMBER: Record<number, Region> = {
  1: "Tarapacá",
  2: "Antofagasta",
  3: "Atacama",
  4: "Coquimbo",
  5: "Valparaíso",
  6: "Libertador General Bernardo O'Higgins",
  7: "Maule",
  8: "Biobío",
  9: "La Araucanía",
  10: "Los Lagos",
  11: "Aysén del General Carlos Ibáñez del Campo",
  12: "Magallanes y de la Antártica Chilena",
  13: "Metropolitana de Santiago",
  14: "Los Ríos",
  15: "Arica y Parinacota",
  16: "Ñuble",
};

/** Cuantas letras distintas se toleran en una palabra de ese largo ("Valparaizo", "Araucnia"). */
function allowedTypos(length: number): number {
  if (length >= 8) return 2;

  return length >= 5 ? 1 : 0;
}

function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];

    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(
        (previous[j] as number) + 1,
        (row[j - 1] as number) + 1,
        (previous[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }

    previous = row;
  }

  return previous[b.length] as number;
}

/** La palabra escrita es esa palabra del nombre: igual, abreviada ("Libert.") o con una falta de ortografia. */
function sameWord(written: string, official: string): boolean {
  if (written === official) return true;
  if (written.length < 3) return false;
  if (official.startsWith(written)) return true;

  return distance(written, official) <= allowedTypos(official.length);
}

/**
 * Reconoce una region por sus palabras, sin importar el orden ni las abreviaturas ("Libertador Gral. B. O'Higgins",
 * "VIII Región del Bio-Bio"). Todas las palabras deben ser de la misma region y al menos una la distingue de las demas.
 */
function matchByWords(text: string): Region | null {
  const expanded = plainText(text)
    .split(" ")
    .filter((word) => word !== "" && !FILLER.has(word))
    .map((word) => EXPANSIONS[word] ?? word);

  const numbers = expanded.map(regionNumber).filter((n): n is number => n !== null);
  const words = expanded.filter((word) => regionNumber(word) === null);
  const byNumber = numbers.length === 1 ? (BY_NUMBER[numbers[0] as number] ?? null) : null;

  if (numbers.length > 1 || (numbers.length === 1 && !byNumber)) return null;
  if (words.length === 0) return byNumber;

  const matches = PROFILES.filter(
    (profile) =>
      words.every((word) => profile.words.some((official) => sameWord(word, official))) &&
      words.some((word) => profile.keys.some((official) => sameWord(word, official))),
  );

  const found = matches.length === 1 ? (matches[0] as { region: Region }).region : null;

  // "VII Región del Biobío": si el numero y el nombre no coinciden no se adivina.
  return byNumber && found !== byNumber ? null : found;
}

/**
 * La region canonica que corresponde a un texto escrito a mano ("region
 * metropolitana", "BIOBIO", "La Araucania", "Libertador Gral. B. O'Higgins", "VIII"), o null si no es ninguna.
 */
export function normalizeRegion(text: string): Region | null {
  const key = plainText(text).replace(/^(region )?(de(l)? )?/, "");

  return BY_KEY.get(plainText(text)) ?? BY_KEY.get(key) ?? matchByWords(text);
}
