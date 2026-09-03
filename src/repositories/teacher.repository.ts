import { teachers } from "@/data";
import type { AvatarId } from "@/config/avatars";
import type { Teacher } from "@/types";

type ContactData = {
  email: string;

  avatarId: AvatarId;
};

class TeacherRepository {
  async findByRut(rut: string): Promise<Teacher | null> {
    const found = teachers.find((teacher) => teacher.rut === rut);

    return Promise.resolve(found ?? null);
  }

  async updateContact(
    rut: string,
    data: ContactData,
  ): Promise<Teacher | null> {
    const found = teachers.find((teacher) => teacher.rut === rut);

    if (!found) {
      return Promise.resolve(null);
    }

    found.email = data.email;
    found.avatarId = data.avatarId;

    return Promise.resolve(found);
  }
}

export const teacherRepository = new TeacherRepository();
