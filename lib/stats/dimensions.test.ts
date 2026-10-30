import { describe, expect, it } from "vitest";

import {
  ageBandOf,
  deviceClassOf,
  deviceOfAttempt,
  dimensionValueLabel,
  filterOptions,
  fixedValues,
  titleCase,
} from "./dimensions";
import type { StudentRow } from "./types";

const NOW = new Date("2026-10-23T15:00:00Z");

function student(rut: string, extra: Partial<StudentRow> = {}): StudentRow {
  return { rut, firstName: "A", paternalLastName: "B", ...extra };
}

describe("filterOptions", () => {
  const students = [
    student("1", { paralelo: 1, entryYear: 2026, region: "RM", comuna: "santiago", gender: "female" }),
    student("2", { paralelo: 1, entryYear: 2026, region: "Biobio", comuna: "Santiago", university: "uvm" }),
    student("3", { paralelo: 1, entryYear: 2025 }),
  ];

  const options = filterOptions(students, NOW, 2026);
  const values = (id: keyof typeof options) => (options[id] ?? []).map((o) => o.value);

  it("paralelo ofrece solo los que existen", () => {
    expect(values("paralelo")).toEqual(["1"]);
  });

  it("universidad, genero y jornada ofrecen todos sus valores, aunque nadie los use", () => {
    expect(values("university")).toEqual(["santo-tomas", "uvm"]);
    expect(values("gender")).toEqual(["female", "male", "other", "undisclosed"]);
    expect(values("studyShift")).toEqual(["day", "evening"]);
  });

  it("nunca ofrece 'Sin dato', aunque haya estudiantes sin el dato", () => {
    for (const list of Object.values(options)) {
      expect((list ?? []).some((o) => o.value === "none" || o.label === "Sin dato")).toBe(false);
    }
  });

  it("region con su nombre oficial y en orden geografico; comuna sin duplicados por mayusculas", () => {
    expect(values("region")).toEqual(["Metropolitana de Santiago", "Biobío"]);
    expect(values("comuna")).toEqual(["Santiago"]);
  });

  it("los tramos de edad son 17 a 20 y despues de 5 en 5", () => {
    expect(fixedValues("ageBand")).toEqual([
      "17-20", "21-25", "26-30", "31-35", "36-40", "41-45", "46-50",
      "51-55", "56-60", "61-65", "66-70", "71-75", "76-80",
    ]);
    expect(dimensionValueLabel("ageBand", "17-20")).toBe("17 a 20 años");
    expect(dimensionValueLabel("ageBand", "21-25")).toBe("21 a 25 años");
  });

  it("ageBandOf pone cada edad en su tramo, en los bordes y fuera de rango", () => {
    const expected: [number, string][] = [
      [17, "17-20"], [20, "17-20"], [21, "21-25"], [25, "21-25"], [26, "26-30"], [30, "26-30"],
      [31, "31-35"], [35, "31-35"], [36, "36-40"], [75, "71-75"], [76, "76-80"], [80, "76-80"],
      [16, "17-20"], [90, "76-80"],
    ];

    for (const [age, band] of expected) expect(ageBandOf(age), String(age)).toBe(band);

    expect(ageBandOf(null)).toBeNull();
    expect(ageBandOf(undefined)).toBeNull();
    expect(ageBandOf(Number.NaN)).toBeNull();
  });

  it("ofrece solo los tramos de edad que hay, y el de un ano atras por si cumplieron anos", () => {
    const aged = filterOptions(
      [
        student("1", { birthDate: "2005-10-01" }), // 21 hoy, 20 hace un ano
        student("2", { birthDate: "1988-03-01" }), // 38 hoy y 37 hace un ano
        student("3"), // sin fecha de nacimiento: no aporta
      ],
      NOW,
      2026,
    );

    expect((aged.ageBand ?? []).map((o) => o.value)).toEqual(["17-20", "21-25", "36-40"]);
    expect((aged.ageBand ?? [])[0]?.label).toBe("17 a 20 años");
  });

  it("el ano en curso aparece aunque nadie haya ingresado todavia ese ano", () => {
    expect(values("entryYear")).toEqual(["2025", "2026"]);
    expect(values("entryYear")).not.toContain("2027");

    const january = filterOptions(students, new Date("2027-01-05T15:00:00Z"), 2027);

    expect((january.entryYear ?? []).map((o) => o.value)).toEqual(["2025", "2026", "2027"]);
  });

  it("sin estudiantes quedan sin opciones los filtros que dependen de los datos", () => {
    const empty = filterOptions([], NOW, 2026);

    expect(empty.paralelo).toEqual([]);
    expect(empty.region).toEqual([]);
    expect((empty.entryYear ?? []).map((o) => o.value)).toEqual(["2026"]);
  });
});

describe("titleCase", () => {
  it("mayuscula inicial por palabra, salvo conectores", () => {
    expect(titleCase("  los   ÁNGELES ")).toBe("Los Ángeles");
    expect(titleCase("san pedro de la paz")).toBe("San Pedro de la Paz");
    expect(titleCase("")).toBe("");
  });
});

describe("deviceClassOf (celular, tableta o computador)", () => {
  const cases: [string, Parameters<typeof deviceClassOf>[0], string | null][] = [
    ["celular tactil", { pointer: "touch", viewportWidth: 390, viewportHeight: 844 }, "mobile"],
    ["celular de lado", { pointer: "touch", viewportWidth: 844, viewportHeight: 390 }, "mobile"],
    ["tableta vertical", { pointer: "touch", viewportWidth: 820, viewportHeight: 1180 }, "tablet"],
    ["tableta grande de lado", { pointer: "touch", viewportWidth: 1366, viewportHeight: 1024 }, "tablet"],
    ["tableta con mouse y pantalla chica", { pointer: "mixed", viewportWidth: 820, viewportHeight: 1180 }, "tablet"],
    ["notebook tactil", { pointer: "mixed", viewportWidth: 1440, viewportHeight: 900 }, "desktop"],
    ["computador con mouse", { pointer: "mouse", viewportWidth: 1920, viewportHeight: 1080 }, "desktop"],
    ["mouse en ventana angosta", { pointer: "mouse", viewportWidth: 400, viewportHeight: 800 }, "desktop"],
    ["sin tamano", { pointer: "touch" }, null],
    ["sin dispositivo", null, null],
    ["puntero desconocido", { pointer: "pen", viewportWidth: 800, viewportHeight: 800 }, null],
  ];

  it.each(cases)("%s", (_name, device, expected) => {
    expect(deviceClassOf(device)).toBe(expected);
  });

  it("usa la primera sesion de la partida", () => {
    expect(
      deviceOfAttempt({
        sessions: [
          { device: { pointer: "touch", viewportWidth: 390, viewportHeight: 844 } },
          { device: { pointer: "mouse", viewportWidth: 1440, viewportHeight: 900 } },
        ],
      }),
    ).toBe("mobile");
    expect(deviceOfAttempt({ sessions: [] })).toBeNull();
    expect(deviceOfAttempt({})).toBeNull();
  });
});
