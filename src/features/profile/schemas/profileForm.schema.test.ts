import { describe, expect, it } from "vitest";

import { ProfileFormSchema } from "./profileForm.schema";

const BASE = {
  email: "ana@uvm.cl",
  avatarId: "cat" as const,
  birthDate: "",
  studyShift: "" as const,
  gender: "" as const,
  region: "",
  comuna: "",
};

describe("ProfileFormSchema: fecha de nacimiento y jornada", () => {
  it("acepta sin fecha ni jornada (se pueden dejar vacías)", () => {
    expect(ProfileFormSchema.safeParse(BASE).success).toBe(true);
  });

  it("acepta una fecha entre 17 y 80 años y cada jornada", () => {
    const year = new Date().getFullYear() - 30;

    for (const studyShift of ["day", "evening"] as const) {
      expect(ProfileFormSchema.safeParse({ ...BASE, birthDate: `${year}-06-15`, studyShift }).success).toBe(true);
    }
  });

  it("rechaza una fecha que no es AAAA-MM-DD, de menor de 17 años o de más de 80", () => {
    const year = new Date().getFullYear();

    for (const birthDate of ["15-06-1995", "no es fecha", `${year - 5}-01-01`, `${year - 95}-01-01`, `${year + 1}-01-01`]) {
      const result = ProfileFormSchema.safeParse({ ...BASE, birthDate });

      expect(result.success, birthDate).toBe(false);
    }
  });

  it("rechaza una jornada que no existe", () => {
    expect(ProfileFormSchema.safeParse({ ...BASE, studyShift: "night" }).success).toBe(false);
  });
});

describe("ProfileFormSchema: región y comuna", () => {
  it("acepta sin región ni comuna, solo la región, o ambas si la comuna es de esa región", () => {
    expect(ProfileFormSchema.safeParse({ ...BASE, region: "Biobío" }).success).toBe(true);
    expect(ProfileFormSchema.safeParse({ ...BASE, region: "Biobío", comuna: "Los Ángeles" }).success).toBe(true);
  });

  it("rechaza una comuna sin región, de otra región o escrita a mano", () => {
    for (const place of [
      { region: "", comuna: "Temuco" },
      { region: "Biobío", comuna: "Temuco" },
      { region: "Biobío", comuna: "los angeles" },
      { region: "Narnia", comuna: "Lota" },
    ]) {
      expect(ProfileFormSchema.safeParse({ ...BASE, ...place }).success, JSON.stringify(place)).toBe(false);
    }
  });
});
