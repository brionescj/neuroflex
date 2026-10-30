import { communesOf } from "@/config/communes";

import { normalizeRegion, plainText } from "./region";

/**
 * La comuna con su nombre oficial que corresponde a un texto guardado en la ficha, siempre que pertenezca a
 * la region; "" si no coincide con ninguna (una comuna antigua escrita a mano, por ejemplo). Copia de
 * normalizeCommune de lib/communes.ts, pero tolerante: devuelve "" en vez de null para usarla como valor de un
 * <select>.
 */
export function officialCommune(region: string, text: string): string {
  const key = plainText(text);

  return communesOf(region).find((commune) => plainText(commune) === key) ?? "";
}

/** La region y la comuna de una ficha tal como las muestra un <select>: oficiales, o "" si no se reconocen. */
export function placeForSelects(region: string | undefined, commune: string | undefined) {
  const official = normalizeRegion(region ?? "") ?? "";

  return { region: official, comuna: official ? officialCommune(official, commune ?? "") : "" };
}
