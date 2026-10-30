import { describe, expect, it } from "vitest";

import { COMMUNES_BY_REGION as CLIENT_COMMUNES, communesOf as clientCommunesOf } from "../src/config/communes";
import { COMMUNES_BY_REGION, communesOf, normalizeCommune } from "./communes";
import { REGIONS } from "./region";

describe("comunas de Chile", () => {
  it("son 346 en las 16 regiones, y cada región trae sus comunas ordenadas y sin repetir", () => {
    expect(Object.keys(COMMUNES_BY_REGION)).toEqual([...REGIONS]);
    expect(Object.values(COMMUNES_BY_REGION).flat()).toHaveLength(346);

    for (const [region, communes] of Object.entries(COMMUNES_BY_REGION)) {
      expect(new Set(communes).size, region).toBe(communes.length);
      expect([...communes], region).toEqual([...communes].sort((a, b) => a.localeCompare(b, "es")));
    }
  });

  it("cuántas comunas tiene cada región (división oficial vigente)", () => {
    expect(Object.fromEntries(Object.entries(COMMUNES_BY_REGION).map(([region, list]) => [region, list.length]))).toEqual({
      "Arica y Parinacota": 4,
      "Tarapacá": 7,
      "Antofagasta": 9,
      "Atacama": 9,
      "Coquimbo": 15,
      "Valparaíso": 38,
      "Metropolitana de Santiago": 52,
      "Libertador General Bernardo O'Higgins": 33,
      "Maule": 30,
      "Ñuble": 21,
      "Biobío": 33,
      "La Araucanía": 32,
      "Los Ríos": 12,
      "Los Lagos": 30,
      "Aysén del General Carlos Ibáñez del Campo": 10,
      "Magallanes y de la Antártica Chilena": 11,
    });
  });

  it("nombres que suelen escribirse mal están con su ortografía oficial", () => {
    expect(communesOf("Ñuble")).toContain("Ránquil");
    expect(communesOf("Ñuble")).toContain("Ñiquén");
    expect(communesOf("Biobío")).toEqual(expect.arrayContaining(["Los Álamos", "Los Ángeles", "Hualpén"]));
    expect(communesOf("Valparaíso")).toEqual(expect.arrayContaining(["La Calera", "Isla de Pascua", "Concón"]));
    expect(communesOf("Los Ríos")).toContain("Los Lagos");
  });

  it("normaliza una comuna escrita a mano solo si pertenece a esa región", () => {
    expect(normalizeCommune("Biobío", "los angeles")).toBe("Los Ángeles");
    expect(normalizeCommune("Biobío", "  LOS ALAMOS ")).toBe("Los Álamos");
    expect(normalizeCommune("Ñuble", "ñiquen")).toBe("Ñiquén");
    expect(normalizeCommune("Biobío", "Temuco")).toBeNull();
    expect(normalizeCommune("Narnia", "Temuco")).toBeNull();
    expect(communesOf("Narnia")).toEqual([]);
  });

  it("la lista del navegador es idéntica a la del servidor", () => {
    expect(CLIENT_COMMUNES).toEqual(COMMUNES_BY_REGION);
    expect(clientCommunesOf("Maule")).toEqual(communesOf("Maule"));
    expect(clientCommunesOf("Narnia")).toEqual([]);
  });
});
