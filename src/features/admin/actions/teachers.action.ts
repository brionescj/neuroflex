import {
  createTeacher,
  listTeachers,
  setTeacherEnabled,
  type CreateTeacherPayload,
} from "../services/teachers.service";

export async function listTeachersAction() {
  return listTeachers();
}

export async function createTeacherAction(payload: CreateTeacherPayload) {
  return createTeacher(payload);
}

export async function setTeacherEnabledAction(rut: string, enabled: boolean) {
  return setTeacherEnabled(rut, enabled);
}