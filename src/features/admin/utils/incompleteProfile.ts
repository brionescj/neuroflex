import type { Student } from "@/types";

export type MissingField = {
  key: "email" | "birthDate" | "studyShift" | "region" | "comuna" | "celular" | "gender" | "university";
  label: string;
  /** true = el estudiante lo completa desde su perfil; false = solo lo registra un administrador. */
  byStudent: boolean;
};

const blank = (value: string | undefined): boolean => value === undefined || value.trim() === "";

/**
 * Los datos de la ficha que aun estan sin registrar. El estudiante puede completar desde su perfil el correo, la
 * fecha de nacimiento, la jornada, la region y la comuna; el celular, el genero y la universidad los registra un
 * administrador (el estudiante no tiene donde editarlos), por eso van marcados aparte.
 */
export function missingProfileFields(student: Student): MissingField[] {
  const missing: MissingField[] = [];

  if (blank(student.email)) missing.push({ key: "email", label: "Correo", byStudent: true });
  if (blank(student.birthDate)) missing.push({ key: "birthDate", label: "Fecha de nacimiento", byStudent: true });
  if (student.studyShift === undefined) missing.push({ key: "studyShift", label: "Jornada", byStudent: true });
  if (blank(student.region)) missing.push({ key: "region", label: "Región", byStudent: true });
  if (blank(student.comuna)) missing.push({ key: "comuna", label: "Comuna", byStudent: true });
  if (blank(student.celular)) missing.push({ key: "celular", label: "Celular", byStudent: false });
  if (student.gender === undefined) missing.push({ key: "gender", label: "Género", byStudent: false });
  if (student.university === undefined) missing.push({ key: "university", label: "Universidad", byStudent: false });

  return missing;
}

/** Los estudiantes habilitados a los que les falta algun dato, con lo que les falta. Quien no esta habilitado no juega. */
export function studentsWithMissingData(students: Student[]): { student: Student; missing: MissingField[] }[] {
  return students
    .filter((student) => student.enabled && !student.isDeleted)
    .map((student) => ({ student, missing: missingProfileFields(student) }))
    .filter((entry) => entry.missing.length > 0);
}

export type ContactFilter = "all" | "pending" | "contacted";

/** Los dos estados de contacto, tal como los ve el administrador. */
export const CONTACT_OPTIONS = [
  { value: "pending", label: "Falta contactar" },
  { value: "contacted", label: "Contactado" },
] as const;

export const contactLabel = (contacted: boolean): string => (contacted ? "Contactado" : "Falta contactar");

/** Sin marca = falta contactar. */
export function matchesContactFilter(student: Student, filter: ContactFilter): boolean {
  if (filter === "all") return true;

  return (student.contacted === true) === (filter === "contacted");
}
