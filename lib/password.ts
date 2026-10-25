import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Reglas confirmadas: minimo 8 caracteres, alfanumerico obligatorio,
 * al menos una mayuscula, al menos un caracter especial, ningun digito
 * repetido de forma inmediata (ej. "22" en cualquier posicion).
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "La contraseña debe ser alfanumérica (letras y números).";
  }

  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe incluir al menos una mayúscula.";
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return "La contraseña debe incluir al menos un carácter especial.";
  }

  for (let i = 0; i < password.length - 1; i++) {
    if (/[0-9]/.test(password[i]) && password[i] === password[i + 1]) {
      return "La contraseña no puede repetir un mismo dígito de forma consecutiva.";
    }
  }

  return null;
}

/**
 * Letras y simbolos con que se arman las contrasenas generadas. Sin las que se
 * confunden al leerlas o dictarlas (I, l, O, 0, 1) porque la persona la recibe
 * escrita o la lee en voz alta.
 */
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#$%&*?+=";

export const GENERATED_PASSWORD_LENGTH = 12;

function pick(chars: string, random: (max: number) => number): string {
  return chars.charAt(random(chars.length));
}

/**
 * Una contrasena aleatoria que cumple las reglas: 12 caracteres con mayusculas,
 * minusculas, numeros y simbolos, y ningun digito repetido de forma consecutiva.
 * `random(max)` entrega un entero de 0 a max - 1 (por defecto, criptografico).
 */
export function generatePassword(random: (max: number) => number = randomInt): string {
  for (;;) {
    const chars = [
      pick(UPPER, random),
      pick(LOWER, random),
      pick(DIGITS, random),
      pick(DIGITS, random),
      pick(SPECIAL, random),
    ];
    const all = UPPER + LOWER + DIGITS + SPECIAL;

    while (chars.length < GENERATED_PASSWORD_LENGTH) chars.push(pick(all, random));

    // Barajar (Fisher-Yates) para que las obligatorias no queden siempre al comienzo.
    for (let i = chars.length - 1; i > 0; i--) {
      const j = random(i + 1);
      const swap = chars[i] as string;

      chars[i] = chars[j] as string;
      chars[j] = swap;
    }

    const candidate = chars.join("");

    // Si quedaron dos digitos iguales juntos se vuelve a armar; pasa pocas veces.
    if (validatePasswordStrength(candidate) === null) return candidate;
  }
}
