/**
 * Lleva una region escrita a mano a su nombre oficial. Copia de lib/region.ts
 * (el servidor no comparte codigo con el navegador), con los mismos casos de
 * prueba. Las fichas antiguas pueden traerla escrita de cualquier forma.
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

/**
 * La region canonica que corresponde a un texto escrito a mano ("region
 * metropolitana", "BIOBIO", "La Araucania"), o null si no es ninguna.
 */
export function normalizeRegion(text: string): Region | null {
  const key = plainText(text).replace(/^(region )?(de(l)? )?/, "");

  return BY_KEY.get(plainText(text)) ?? BY_KEY.get(key) ?? null;
}
