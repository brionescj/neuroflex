import { toNameCase } from "@/utils/personName";

export function sanitizeNameInput(value: string): string {
  return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "");
}

/**
 * Lo que queda de lo que se escribe en un campo de nombre o apellido: solo
 * letras y espacios, un solo espacio entre palabras y la inicial de cada una en
 * mayuscula ("camiLo andres" se ve "Camilo Andres"). El servidor aplica la misma regla.
 */
export function formatNameInput(value: string): string {
  return toNameCase(sanitizeNameInput(value).replace(/^\s+/, "").replace(/\s{2,}/g, " "));
}
