import { admins } from "@/data";
import type { Admin } from "@/types";

class AdminRepository {
  async findByRut(rut: string): Promise<Admin | null> {
    const found = admins.find((admin) => admin.rut === rut);

    return Promise.resolve(found ?? null);
  }
}

export const adminRepository = new AdminRepository();
