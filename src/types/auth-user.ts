import type { UserRole } from "./common";

export type AuthUser = {
  id: string;

  rut: string;

  password: string;

  role: UserRole;

  enabled: boolean;
};