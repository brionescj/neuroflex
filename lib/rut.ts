export function normalizeRut(rut: string): string {
  return rut
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .replace(/k/g, "K");
}

export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function addHyphen(rut: string): string {
  const clean = cleanRut(rut);

  if (clean.length <= 1) return clean;

  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

export function normalizeForDatabase(rut: string): string {
  return addHyphen(normalizeRut(rut));
}

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

export function isValidRut(rut: string): boolean {
  const normalized = normalizeRut(rut);

  const [body, dv] = normalized.split("-");

  if (!body || !dv) return false;
  if (!/^\d+$/.test(body)) return false;

  return calculateDV(body) === dv.toUpperCase();
}