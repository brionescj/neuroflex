import { universityLabel } from "@/config/studentOptions";
import type { Student } from "@/types";

import { toInputDate } from "./birthDate";

/** Desde esta edad (cumplida) el estudiante se destaca en amarillo en la lista del administrador. */
export const OLDER_FROM_AGE = 45;

/** Anos cumplidos en `now`; null si la ficha no trae una fecha de nacimiento que se entienda. */
export function ageOf(birthDate: string | undefined, now: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toInputDate(birthDate));

  if (!match) return null;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const birthdayPassed = now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day);
  const age = now.getFullYear() - year - (birthdayPassed ? 0 : 1);

  return age >= 0 ? age : null;
}

/** true desde los 45 anos cumplidos. */
export function isOlder(age: number | null): boolean {
  return age !== null && age >= OLDER_FROM_AGE;
}

export type SortKey = "name" | "university" | "paralelo" | "age" | "entry" | "status";
export type SortDirection = "asc" | "desc";
export type SortState = { key: SortKey; direction: SortDirection };

/** Al abrir el panel: del mayor al menor. */
export const DEFAULT_SORT: SortState = { key: "age", direction: "desc" };

export const SORT_LABELS: Record<SortKey, string> = {
  name: "Nombre",
  university: "Universidad",
  paralelo: "Paralelo",
  age: "Edad",
  entry: "Ingreso",
  status: "Estado",
};

/**
 * Como las carpetas de Windows: tocar una columna nueva la ordena de menor a mayor (A a Z); tocar la que ya
 * ordena invierte el sentido.
 */
export function nextSort(current: SortState, key: SortKey): SortState {
  return current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" };
}

const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

function byName(a: Student, b: Student): number {
  return (
    collator.compare(a.paternalLastName, b.paternalLastName) ||
    collator.compare(a.maternalLastName, b.maternalLastName) ||
    collator.compare(a.firstName, b.firstName) ||
    collator.compare(a.rut, b.rut)
  );
}

/** El valor por el que se ordena cada columna; null = sin dato (siempre va al final, en cualquier sentido). */
function valueOf(student: Student, key: SortKey, now: Date): string | number | null {
  switch (key) {
    case "name":
      return `${student.paternalLastName} ${student.maternalLastName} ${student.firstName}`;
    case "university":
      return universityLabel(student.university) ?? null;
    case "paralelo":
      return student.paralelo;
    case "age":
      return ageOf(student.birthDate, now);
    case "entry":
      return student.entryYear;
    case "status":
      // Habilitados primero al ordenar de menor a mayor.
      return student.enabled ? 0 : 1;
  }
}

/** La lista ordenada; no modifica la original. Quien no tiene el dato queda al final; los empates, por apellido. */
export function sortStudents(students: readonly Student[], sort: SortState, now: Date = new Date()): Student[] {
  const sign = sort.direction === "asc" ? 1 : -1;

  return students
    .map((student) => ({ student, value: valueOf(student, sort.key, now) }))
    .sort((a, b) => {
      if (a.value === null && b.value === null) return byName(a.student, b.student);
      if (a.value === null) return 1;
      if (b.value === null) return -1;

      const order =
        typeof a.value === "number" && typeof b.value === "number"
          ? a.value - b.value
          : collator.compare(String(a.value), String(b.value));

      return order !== 0 ? order * sign : byName(a.student, b.student);
    })
    .map((entry) => entry.student);
}
