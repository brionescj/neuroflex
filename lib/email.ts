/**
 * Reglas del correo de contacto. Es el mismo criterio que src/utils/email.ts (el
 * servidor no comparte codigo con el navegador): ambos tests usan los mismos
 * casos. Se guarda siempre en minusculas y solo con letras sin tilde (la ñ se
 * admite en el nombre antes del @), numeros y los simbolos . _ - antes del @ (. y - en el dominio). El + no se
 * admite: casi ningun correo institucional lo usa.
 */
const MAX_LOCAL_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 253;

const ALLOWED_CHARS = /^[a-zñ0-9@._-]*$/;
const LOCAL_PART = /^[a-zñ0-9](?:[a-zñ0-9._-]*[a-zñ0-9])?$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const TOP_LEVEL_DOMAIN = /^[a-z]{2,}$/;

/** Como se guarda un correo: sin espacios en los bordes y en minusculas. */
export function normalizeEmail(email: string): string {
  // NFC: una ñ escrita como n + tilde suelta es la misma ñ.
  return email.trim().normalize("NFC").toLowerCase();
}

/**
 * Por que un correo (ya normalizado) no sirve, en una frase para mostrar, o
 * null si esta bien.
 */
export function emailProblem(email: string): string | null {
  if (email === "") return "Ingresa un correo.";

  if (!ALLOWED_CHARS.test(email)) {
    return "El correo solo puede llevar letras (sin tilde, la ñ sí), números y los símbolos . _ -";
  }

  const parts = email.split("@");

  if (parts.length === 1) return "Falta el @ en el correo.";
  if (parts.length > 2) return "El correo tiene más de un @.";

  const [local = "", domain = ""] = parts;

  if (local === "") return "Falta el nombre antes del @.";
  if (domain === "") return "Falta el dominio después del @.";

  if (!domain.includes(".")) {
    return "Falta el punto del dominio después del @ (por ejemplo, .cl o .com).";
  }

  if (local.length > MAX_LOCAL_LENGTH) {
    return "El nombre antes del @ es demasiado largo.";
  }

  if (!LOCAL_PART.test(local) || local.includes("..")) {
    return "El nombre antes del @ no puede empezar ni terminar con símbolos, ni tener puntos seguidos.";
  }

  const labels = domain.split(".");

  if (
    domain.length > MAX_DOMAIN_LENGTH ||
    !labels.every((label) => DOMAIN_LABEL.test(label)) ||
    !TOP_LEVEL_DOMAIN.test(labels[labels.length - 1] as string)
  ) {
    return "El dominio después del @ no es válido (por ejemplo, uvm.cl).";
  }

  return null;
}

/** Un correo sirve si, una vez normalizado, no tiene ningun problema. */
export function isValidEmail(email: string): boolean {
  return typeof email === "string" && emailProblem(normalizeEmail(email)) === null;
}
