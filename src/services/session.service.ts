import type { SessionUser } from "@/types";

const SESSION_KEY = "neuroflex.session";

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

    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      localStorage.removeItem(SESSION_KEY);

      return null;
    }
  },

  clear(): void {
    localStorage.removeItem(SESSION_KEY);
  },
};
