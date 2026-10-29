import type { Gender, Paralelo, StudyShift, University } from "@/types";

/**
 * Valores y etiquetas de los datos que el admin completa en la ficha del
 * estudiante. Los valores deben coincidir con lib/studentFields.ts (un test lo
 * comprueba).
 */
export const GENDER_OPTIONS: readonly { value: Gender; label: string }[] = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
  { value: "undisclosed", label: "No informa" },
];

export const UNIVERSITY_OPTIONS: readonly { value: University; label: string }[] = [
  { value: "santo-tomas", label: "Santo Tomás" },
  { value: "uvm", label: "UVM" },
];

/** Jornada de estudio. Los valores deben coincidir con STUDY_SHIFTS de lib/studentFields.ts. */
export const STUDY_SHIFT_OPTIONS: readonly { value: StudyShift; label: string }[] = [
  { value: "day", label: "Diurna" },
  { value: "evening", label: "Vespertina" },
];

/** Los cinco paralelos. Deben coincidir con PARALELOS de lib/studentFields.ts. */
export const PARALELO_OPTIONS: readonly Paralelo[] = [1, 2, 3, 4, 5];

export function studyShiftLabel(value: StudyShift | undefined): string | undefined {
  return STUDY_SHIFT_OPTIONS.find((option) => option.value === value)?.label;
}

export function genderLabel(value: Gender | undefined): string | undefined {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label;
}

export function universityLabel(value: University | undefined): string | undefined {
  return UNIVERSITY_OPTIONS.find((option) => option.value === value)?.label;
}


/** Las 16 regiones, de norte a sur. Deben coincidir con lib/region.ts (un test lo comprueba). */
export const REGION_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "Arica y Parinacota", label: "Arica y Parinacota" },
  { value: "Tarapacá", label: "Tarapacá" },
  { value: "Antofagasta", label: "Antofagasta" },
  { value: "Atacama", label: "Atacama" },
  { value: "Coquimbo", label: "Coquimbo" },
  { value: "Valparaíso", label: "Valparaíso" },
  { value: "Metropolitana de Santiago", label: "Metropolitana de Santiago" },
  { value: "Libertador General Bernardo O'Higgins", label: "Libertador General Bernardo O'Higgins" },
  { value: "Maule", label: "Maule" },
  { value: "Ñuble", label: "Ñuble" },
  { value: "Biobío", label: "Biobío" },
  { value: "La Araucanía", label: "La Araucanía" },
  { value: "Los Ríos", label: "Los Ríos" },
  { value: "Los Lagos", label: "Los Lagos" },
  { value: "Aysén del General Carlos Ibáñez del Campo", label: "Aysén del General Carlos Ibáñez del Campo" },
  { value: "Magallanes y de la Antártica Chilena", label: "Magallanes y de la Antártica Chilena" },
];


/**
 * Edad permitida al ingresar un estudiante (anos cumplidos hoy). Deben
 * coincidir con lib/studentFields.ts (un test lo comprueba).
 */
export const MIN_STUDENT_AGE = 17;
export const MAX_STUDENT_AGE = 80;
