/**
 * Aviso para la pantalla de inicio de sesion cuando la sesion se cerro sin que la persona lo pidiera
 * (por ejemplo, porque entro desde otro dispositivo). Vive solo en memoria: recargar la pagina lo olvida.
 */
let notice: string | null = null;

export const SESSION_REPLACED_EVENT = "neuroflex:session-replaced";

export function setSessionNotice(message: string): void {
  notice = message;
}

/** Entrega el aviso pendiente (una sola vez). */
export function takeSessionNotice(): string | null {
  const current = notice;

  notice = null;

  return current;
}
