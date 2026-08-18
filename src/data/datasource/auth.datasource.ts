import type { AuthUser } from "@/types";

/**
 * Cuentas que pueden iniciar sesion.
 *
 * Un estudiante SOLO aparece aqui despues de registrarse.
 */
export const authUsers: AuthUser[] = [
  {
    id: "auth-1",
    rut: "11111111-1",
    password: "123456",
    role: "admin",
    enabled: true,
  },
  {
    id: "auth-2",
    rut: "33333333-3",
    password: "123456",
    role: "teacher",
    enabled: true,
  },
  {
    id: "auth-3",
    rut: "12345678-5",
    password: "123456",
    role: "student",
    enabled: true,
  },
];
