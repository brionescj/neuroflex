import type { Admin, Student, Teacher } from "@/types/user";

export const students: Student[] = [
  {
    id: "student-1",
    rut: "11111111-1",
    name: "Juan Pérez",
    email: "juan@neuroflex.cl",
    password: "123456",
    role: "student",
    active: true,
    createdAt: new Date(),

    birthDate: new Date("2002-05-18"),
    studyMode: "day",
    works: false,
    admissionYear: 2024,
    admissionSemester: 1,
  },
  {
    id: "student-2",
    rut: "22222222-2",
    name: "María González",
    email: "maria@neuroflex.cl",
    password: "123456",
    role: "student",
    active: true,
    createdAt: new Date(),

    birthDate: new Date("2001-10-11"),
    studyMode: "evening",
    works: true,
    admissionYear: 2024,
    admissionSemester: 2,
  },
];

export const teachers: Teacher[] = [
  {
    id: "teacher-1",
    rut: "33333333-3",
    name: "Profesor Demo",
    email: "docente@neuroflex.cl",
    password: "123456",
    role: "teacher",
    active: true,
    createdAt: new Date(),
  },
];

export const admins: Admin[] = [
  {
    id: "admin-1",
    rut: "44444444-4",
    name: "Administrador",
    email: "admin@neuroflex.cl",
    password: "123456",
    role: "admin",
    active: true,
    createdAt: new Date(),
  },
];