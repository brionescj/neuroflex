import { Student } from "./models/Student";
import { Teacher } from "./models/Teacher";
import { Admin } from "./models/Admin";

export async function findProfile(rut: string, role: string) {
  if (role === "student") return Student.findOne({ rut, isDeleted: { $ne: true } });
  if (role === "teacher") return Teacher.findOne({ rut });
  return Admin.findOne({ rut });
}