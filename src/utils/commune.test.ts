import { describe, expect, it } from "vitest";

import { officialCommune, placeForSelects } from "./commune";

describe("región y comuna de una ficha para los selectores", () => {
  it("lleva lo guardado a los nombres oficiales", () => {
    expect(placeForSelects("biobio", "los angeles")).toEqual({ region: "Biobío", comuna: "Los Ángeles" });
    expect(placeForSelects("RM", "ñuñoa")).toEqual({ region: "Metropolitana de Santiago", comuna: "Ñuñoa" });
  });

  it("lo que no se reconoce queda vacío: el selector muestra «Seleccionar»", () => {
    expect(placeForSelects(undefined, "Temuco")).toEqual({ region: "", comuna: "" });
    expect(placeForSelects("Narnia", "Temuco")).toEqual({ region: "", comuna: "" });
    expect(placeForSelects("Biobío", "Temuco")).toEqual({ region: "Biobío", comuna: "" });
    expect(placeForSelects("Biobío", undefined)).toEqual({ region: "Biobío", comuna: "" });
  });

  it("una comuna solo vale dentro de su región", () => {
    expect(officialCommune("La Araucanía", "temuco")).toBe("Temuco");
    expect(officialCommune("Biobío", "temuco")).toBe("");
  });
});
