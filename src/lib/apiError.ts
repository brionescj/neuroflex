import { fail, type ApiResponse } from "@/types";

function hasApiMessage(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;

  const { success, message } = data as { success?: unknown; message?: unknown };

  return (
    typeof success === "boolean" && typeof message === "string" && message !== ""
  );
}

/**
 * Convierte en ApiResponse la respuesta de error de la API. Si el servidor no
 * respondio con el JSON esperado (una pagina 404 de la plataforma, el texto de
 * un error 500...), devuelve un mensaje propio en vez de dejar `message`
 * vacio: sin esto la pantalla mostraba un aviso en blanco.
 */
export function responseFromError<T>(response: {
  status: number;
  data: unknown;
}): ApiResponse<T> {
  if (hasApiMessage(response.data)) {
    return response.data as ApiResponse<T>;
  }

  return fail(
    `El servidor respondió con un error inesperado (HTTP ${response.status}).`,
  );
}
