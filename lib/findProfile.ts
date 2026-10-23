import { Student } from "./models/Student";
import { Admin } from "./models/Admin";

/** La ficha de una cuenta segun su rol. Un rol que ya no existe no tiene ficha. */
export async function findProfile(rut: string, role: string) {
  if (role === "student") return Student.findOne({ rut, isDeleted: { $ne: true } });
  if (role === "admin") return Admin.findOne({ rut });

  return null;
}
