import {
  createStudent,
  listStudents,
  setStudentEnabled,
  updateStudentDetails,
  type CreateStudentPayload,
  type UpdateStudentDetailsPayload,
} from "../services/students.service";

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