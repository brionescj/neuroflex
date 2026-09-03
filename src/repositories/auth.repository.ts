import { authUsers } from "@/data";
import type { AuthUser, UserRole } from "@/types";

type CreateAuthUserInput = {
  rut: string;

  password: string;

  role: UserRole;
};

/**
 * Unico punto de acceso a las credenciales.
 *
 * Cuando exista MongoDB Atlas solo cambia el cuerpo de estos metodos.
 *
 * IMPORTANTE: ese mismo cambio debe incluir hashear el password (bcrypt/argon2)
 * antes de guardarlo, y mover la validacion de sesion a un endpoint server-side.
 * Hoy el password se guarda en texto plano y la sesion es 100% falsificable
 * desde localStorage — aceptable solo porque no hay backend real todavia.
 */
class AuthRepository {
  async findByRut(rut: string): Promise<AuthUser | null> {
    const found = authUsers.find((user) => user.rut === rut);

    return Promise.resolve(found ?? null);
  }

  async existsByRut(rut: string): Promise<boolean> {
    return Promise.resolve(
      authUsers.some((user) => user.rut === rut),
    );
  }

  async create(input: CreateAuthUserInput): Promise<AuthUser> {
    const created: AuthUser = {
      id: `auth-${authUsers.length + 1}`,
      rut: input.rut,
      password: input.password,
      role: input.role,
      enabled: true,
    };

    authUsers.push(created);

    return Promise.resolve(created);
  }
}

export const authRepository = new AuthRepository();