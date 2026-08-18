import { students } from "@/data";
import type { Student } from "@/types";

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
}

export const studentRepository = new StudentRepository();
