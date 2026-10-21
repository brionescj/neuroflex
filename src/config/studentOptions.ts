import type { Gender, University } from "@/types";

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

export function genderLabel(value: Gender | undefined): string | undefined {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label;
}

export function universityLabel(value: University | undefined): string | undefined {
  return UNIVERSITY_OPTIONS.find((option) => option.value === value)?.label;
}
