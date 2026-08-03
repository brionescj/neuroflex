import { admins, students, teachers } from "@/database";
import type { User } from "@/types/user";

class AuthRepository {
  private users(): User[] {
    return [
      ...students,
      ...teachers,
      ...admins,
    ];
  }

  async getUserByRut(rut: string): Promise<User | null> {
    const user =
      this.users().find((user) => user.rut === rut) ?? null;

    return Promise.resolve(user);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user =
      this.users().find((user) => user.email === email) ?? null;

    return Promise.resolve(user);
  }

  async existsRut(rut: string): Promise<boolean> {
    return Promise.resolve(
      this.users().some((user) => user.rut === rut),
    );
  }

  async existsEmail(email: string): Promise<boolean> {
    return Promise.resolve(
      this.users().some((user) => user.email === email),
    );
  }
}

export default new AuthRepository();