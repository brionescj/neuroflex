export type UserRole = "student" | "teacher" | "admin";

export type StudyMode = "day" | "evening";

export interface User {
  id: string;

  rut: string;

  name: string;

  email: string;

  password: string;

  role: UserRole;

  active: boolean;

  createdAt: Date;
}

export interface Student extends User {
  role: "student";

  birthDate: Date;

  studyMode: StudyMode;

  works: boolean;

  admissionYear: number;

  admissionSemester: 1 | 2;
}

export interface Teacher extends User {
  role: "teacher";
}

export interface Admin extends User {
  role: "admin";
}