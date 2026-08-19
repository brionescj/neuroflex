import type { Student } from "@/types";

/**
 * Nomina cargada por la universidad.
 *
 * registered = false  ->  puede crear su cuenta.
 * registered = true   ->  ya tiene cuenta en authUsers.
 */
export const students: Student[] = [
  {
    rut: "12345678-5",
    firstName: "Juan",
    paternalLastName: "Perez",
    maternalLastName: "Soto",
    birthDate: "2002-05-18",
    entryYear: 2024,
    entrySemester: 1,
    studyShift: "day",
    works: false,
    enabled: true,
    registered: true,
    email: "juan.perez@alumnos.uvm.cl",
    avatarId: "cat",
  },
  {
    rut: "19876543-0",
    firstName: "Maria",
    paternalLastName: "Gonzalez",
    maternalLastName: "Rojas",
    birthDate: "2001-10-11",
    entryYear: 2024,
    entrySemester: 2,
    studyShift: "evening",
    works: true,
    enabled: true,
    registered: false,
    email: "maria.gonzalez@alumnos.uvm.cl",
    avatarId: "rabbit",
  },
  {
    rut: "20345678-6",
    firstName: "Camila",
    paternalLastName: "Munoz",
    maternalLastName: "Lagos",
    birthDate: "2003-01-30",
    entryYear: 2025,
    entrySemester: 1,
    studyShift: "day",
    works: false,
    enabled: false,
    registered: false,
    email: "camila.munoz@alumnos.uvm.cl",
    avatarId: "turtle",
  },
];
