/**
 * Elimina puntos, espacios y convierte la K en mayúscula.
 * Mantiene el guion si existe.
 */
export function normalizeRut(rut: string): string {
  return rut
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .replace(/k/g, "K");
}

/**
 * Devuelve solo números y K.
 */
export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

/**
 * Agrega el guion automáticamente.
 *
 * 123456785 -> 12345678-5
 */
export function addHyphen(rut: string): string {
  const clean = cleanRut(rut);

  if (clean.length <= 1) return clean;

  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

/**
 * Agrega puntos al RUT.
 *
 * 12345678-5
 * ↓
 * 12.345.678-5
 */
export function formatRut(rut: string): string {
  const withHyphen = addHyphen(rut);

  const [body, dv] = withHyphen.split("-");

  if (!body || !dv) return withHyphen;

  return `${Number(body).toLocaleString("es-CL")}-${dv}`;
}

/**
 * Calcula el dígito verificador de un RUT.
 */
export function calculateDV(body: string): string {
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;

    multiplier++;

    if (multiplier > 7) {
      multiplier = 2;
    }
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) return "0";

  if (remainder === 10) return "K";

  return remainder.toString();
}

/**
 * Valida un RUT chileno.
 */
export function isValidRut(rut: string): boolean {
  const normalized = normalizeRut(rut);

  const [body, dv] = normalized.split("-");

  if (!body || !dv) {
    return false;
  }

  if (!/^\d+$/.test(body)) {
    return false;
  }

  return calculateDV(body) === dv.toUpperCase();
}

/**
 * Formato único para almacenar en MongoDB.
 *
 * 12.345.678-5
 * ↓
 * 12345678-5
 */
export function normalizeForDatabase(rut: string): string {
  return addHyphen(normalizeRut(rut));
}