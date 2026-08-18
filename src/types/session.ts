import type { UserRole } from "./common";

/**
 * Lo unico que se persiste en el navegador.
 *
 * Nunca contiene password ni datos sensibles.
 */
export type SessionUser = {
  id: string;

  rut: string;

  role: UserRole;

  displayName: string;
};
