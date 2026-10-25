/**
 * Reglas de contraseña y generador de contraseñas aleatorias. Es el mismo
 * criterio que lib/password.ts (el navegador no comparte codigo con el
 * servidor): lib/passwordParity.test.ts comprueba que coincidan. El servidor
 * siempre vuelve a validar; esto solo evita el viaje de ida y vuelta.
 *
 * Reglas: minimo 8 caracteres, letras y numeros, al menos una mayuscula, al
 * menos un caracter especial y ningun digito repetido de forma consecutiva.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "La contraseña debe ser alfanumérica (letras y números).";
  }

  if (!/[A-Z]/.test(password)) return "La contraseña debe incluir al menos una mayúscula.";

  if (!/[^a-zA-Z0-9]/.test(password)) return "La contraseña debe incluir al menos un carácter especial.";

  if (/(\d)\1/.test(password)) {
    return "La contraseña no puede repetir un mismo dígito de forma consecutiva.";
  }

  return null;
}

// Sin las que se confunden al leerlas o dictarlas (I, l, O, 0, 1).
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#$%&*?+=";

export const GENERATED_PASSWORD_LENGTH = 12;

/** Entero de 0 a max - 1 con el azar criptografico del navegador, sin sesgo. */
function secureRandomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);

  do {
    crypto.getRandomValues(buffer);
  } while ((buffer[0] as number) >= limit);

  return (buffer[0] as number) % max;
}

function pick(chars: string, random: (max: number) => number): string {
  return chars.charAt(random(chars.length));
}

/** Una contraseña aleatoria que cumple las reglas (12 caracteres: mayusculas, minusculas, numeros y simbolos). */
export function generatePassword(random: (max: number) => number = secureRandomInt): string {
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

    if (passwordProblem(candidate) === null) return candidate;
  }
}
