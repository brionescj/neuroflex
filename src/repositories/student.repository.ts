import { students } from "@/data";
import type { AvatarId } from "@/config/avatars";
import type { Student } from "@/types";

type ContactData = {
  email: string;

  avatarId: AvatarId;
};

class StudentRepository {
  async findByRut(rut: string): Promise<Student | null> {
    const found = students.find((student) => student.rut === rut);

    return Promise.resolve(found ?? null);
  }

  async markAsRegistered(rut: string): Promise<Student | null> {
    const found = students.find((student) => student.rut === rut);

    if (!found) {
      return Promise.resolve(null);
    }

    found.registered = true;

    return Promise.resolve(found);
  }

  async updateContact(
    rut: string,
    data: ContactData,
  ): Promise<Student | null> {
    const found = students.find((student) => student.rut === rut);

    if (!found) {
      return Promise.resolve(null);
    }

    found.email = data.email;
    found.avatarId = data.avatarId;

    return Promise.resolve(found);
  }
}

export const studentRepository = new StudentRepository();
