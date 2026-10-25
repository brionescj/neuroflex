import {
  createStudent,
  generateStudentPassword,
  listStudents,
  prefetchStudents,
  setStudentEnabled,
  updateStudentDetails,
  type CreateStudentPayload,
  type UpdateStudentDetailsPayload,
} from "../services/students.service";
import { prefetchAdmins } from "../services/admins.service";

export async function listStudentsAction() {
  return listStudents();
}

export async function createStudentAction(payload: CreateStudentPayload) {
  return createStudent(payload);
}

export async function setStudentEnabledAction(rut: string, enabled: boolean) {
  return setStudentEnabled(rut, enabled);
}

export async function updateStudentDetailsAction(
  rut: string,
  payload: UpdateStudentDetailsPayload,
) {
  return updateStudentDetails(rut, payload);
}

export async function generateStudentPasswordAction(rut: string, adminPassword: string) {
  return generateStudentPassword(rut, adminPassword);
}

/** Pide por adelantado los listados del panel de inicio (estudiantes y administradores). */
export function prefetchAdminHomeAction() {
  prefetchStudents();
  prefetchAdmins();
}
