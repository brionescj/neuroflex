import { admins } from "@/data";
import type { AvatarId } from "@/config/avatars";
import type { Admin } from "@/types";

type ContactData = {
  email: string;

  avatarId: AvatarId;
};

class AdminRepository {
  async findByRut(rut: string): Promise<Admin | null> {
    const found = admins.find((admin) => admin.rut === rut);

    return Promise.resolve(found ?? null);
  }

  async updateContact(
    rut: string,
    data: ContactData,
  ): Promise<Admin | null> {
    const found = admins.find((admin) => admin.rut === rut);

    if (!found) {
      return Promise.resolve(null);
    }

    found.email = data.email;
    found.avatarId = data.avatarId;

    return Promise.resolve(found);
  }
}

export const adminRepository = new AdminRepository();
