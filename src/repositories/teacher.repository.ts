import { teachers } from "@/data";
import type { Teacher } from "@/types";

class TeacherRepository {
  async findByRut(rut: string): Promise<Teacher | null> {
    const found = teachers.find((teacher) => teacher.rut === rut);

    return Promise.resolve(found ?? null);
  }
}

export const teacherRepository = new TeacherRepository();
