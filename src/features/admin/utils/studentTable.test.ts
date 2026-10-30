import { describe, expect, it } from "vitest";

import type { Student } from "@/types";

import { DEFAULT_SORT, OLDER_FROM_AGE, ageOf, isOlder, nextSort, sortStudents } from "./studentTable";

const NOW = new Date(2026, 9, 29); // 29 de octubre de 2026

function student(rut: string, extra: Partial<Student> = {}): Student {
  return {
    rut,
    firstName: "Ana",
    paternalLastName: "Pérez",
    maternalLastName: "Soto",
    paralelo: 1,
    entryYear: 2026,
    enabled: true,
    registered: false,
    avatarId: "cat",
    isDeleted: false,
    ...extra,
  } as Student;
}

describe("edad en la lista del administrador", () => {
  it("cuenta los años cumplidos hoy", () => {
    expect(ageOf("1981-10-29", NOW)).toBe(45); // cumple 45 hoy
    expect(ageOf("1981-10-30", NOW)).toBe(44); // los cumple mañana
    expect(ageOf("2001-03-15", NOW)).toBe(25);
    expect(ageOf("15-03-2001", NOW)).toBe(25); // fichas antiguas DD-MM-AAAA
  });

  it("sin fecha, o con una que no se entiende, no hay edad", () => {
    expect(ageOf(undefined, NOW)).toBeNull();
    expect(ageOf("", NOW)).toBeNull();
    expect(ageOf("ayer", NOW)).toBeNull();
  });

  it("se destaca desde los 45 años, no desde los 46", () => {
    expect(OLDER_FROM_AGE).toBe(45);
    expect(isOlder(44)).toBe(false);
    expect(isOlder(45)).toBe(true);
    expect(isOlder(46)).toBe(true);
    expect(isOlder(null)).toBe(false);
  });
});

describe("orden de la tabla de estudiantes", () => {
  const list = [
    student("1-9", { firstName: "Joven", paternalLastName: "Zapata", birthDate: "2005-01-10" }),
    student("2-7", { firstName: "Sin", paternalLastName: "Fecha" }),
    student("3-5", { firstName: "Mayor", paternalLastName: "Araya", birthDate: "1970-06-01", university: "uvm" }),
    student("4-3", { firstName: "Media", paternalLastName: "Mora", birthDate: "1990-02-02", university: "santo-tomas" }),
  ];
  const names = (sorted: Student[]) => sorted.map((s) => s.firstName);

  it("al abrir va de la mayor a la menor edad, y quien no tiene fecha al final", () => {
    expect(DEFAULT_SORT).toEqual({ key: "age", direction: "desc" });
    expect(names(sortStudents(list, DEFAULT_SORT, NOW))).toEqual(["Mayor", "Media", "Joven", "Sin"]);
  });

  it("de menor a mayor edad, quien no tiene fecha sigue al final", () => {
    expect(names(sortStudents(list, { key: "age", direction: "asc" }, NOW))).toEqual(["Joven", "Media", "Mayor", "Sin"]);
  });

  it("por universidad, A a Z y Z a A; sin universidad al final, por apellido", () => {
    expect(names(sortStudents(list, { key: "university", direction: "asc" }, NOW))).toEqual(["Media", "Mayor", "Sin", "Joven"]);
    expect(names(sortStudents(list, { key: "university", direction: "desc" }, NOW))).toEqual(["Mayor", "Media", "Sin", "Joven"]);
  });

  it("por nombre, ordena por apellido", () => {
    expect(names(sortStudents(list, { key: "name", direction: "asc" }, NOW))).toEqual(["Mayor", "Sin", "Media", "Joven"]);
    expect(names(sortStudents(list, { key: "name", direction: "desc" }, NOW))).toEqual(["Joven", "Media", "Sin", "Mayor"]);
  });

  it("por paralelo, ingreso y estado", () => {
    const mixed = [
      student("1-9", { firstName: "C", paralelo: 3, entryYear: 2024, enabled: false }),
      student("2-7", { firstName: "A", paralelo: 1, entryYear: 2026 }),
      student("3-5", { firstName: "B", paralelo: 2, entryYear: 2025 }),
    ];

    expect(names(sortStudents(mixed, { key: "paralelo", direction: "asc" }))).toEqual(["A", "B", "C"]);
    expect(names(sortStudents(mixed, { key: "entry", direction: "desc" }))).toEqual(["A", "B", "C"]);
    expect(names(sortStudents(mixed, { key: "status", direction: "asc" }))[2]).toBe("C");
    expect(names(sortStudents(mixed, { key: "status", direction: "desc" }))[0]).toBe("C");
  });

  it("los empates se ordenan por apellido, y la lista original no se modifica", () => {
    const same = [
      student("1-9", { firstName: "B", paternalLastName: "Vega", birthDate: "2000-01-01" }),
      student("2-7", { firstName: "A", paternalLastName: "Díaz", birthDate: "2000-01-01" }),
    ];
    const copy = [...same];

    expect(names(sortStudents(same, DEFAULT_SORT, NOW))).toEqual(["A", "B"]);
    expect(same).toEqual(copy);
  });

  it("como las carpetas de Windows: una columna nueva empieza de menor a mayor y tocarla otra vez invierte", () => {
    const a = nextSort(DEFAULT_SORT, "university");

    expect(a).toEqual({ key: "university", direction: "asc" });
    expect(nextSort(a, "university")).toEqual({ key: "university", direction: "desc" });
    expect(nextSort(nextSort(a, "university"), "university")).toEqual({ key: "university", direction: "asc" });
    // Tocar la edad estando ya por edad (mayor a menor) la invierte.
    expect(nextSort(DEFAULT_SORT, "age")).toEqual({ key: "age", direction: "asc" });
  });
});
