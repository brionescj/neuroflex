import type { SessionUser } from "@/types";
import { SessionUserSchema } from "./session.schema";

/**
 * Se exporta SOLO para session.service.test.ts (evita duplicar el
 * string). Ningun otro archivo debe importarla para tocar
 * localStorage directamente: pasa siempre por sessionService.
 */
export const SESSION_KEY = "neuroflex.session";

/**
 * Unico lugar del proyecto que toca localStorage.
 *
 * Cuando exista JWT, aqui guardaremos el accessToken
 * y el resto de la aplicacion no se entera.
 */
export const sessionService = {
  save(user: SessionUser): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  read(): SessionUser | null {
    const raw = localStorage.getItem(SESSION_KEY);

    if (!raw) {
      return null;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.removeItem(SESSION_KEY);

      return null;
    }

    const result = SessionUserSchema.safeParse(parsed);

    if (!result.success) {
      localStorage.removeItem(SESSION_KEY);

      return null;
    }

    return result.data;
  },

  clear(): void {
    localStorage.removeItem(SESSION_KEY);
  },
};
