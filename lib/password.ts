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