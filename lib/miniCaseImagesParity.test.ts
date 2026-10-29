import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DEFAULT_MINI_CASE_IMAGE, MINI_CASE_IMAGE_KEYS, isMiniCaseImageKey } from "./miniCaseImages";

// El servidor no importa codigo del navegador: se lee el catalogo del frontend como texto.
const source = readFileSync("src/config/miniCaseImages.ts", "utf8");
const scenes = readFileSync("src/features/games/mini-cases/images/scenes.tsx", "utf8");

describe("imagenes de los mini casos: servidor y navegador coinciden", () => {
  it("las claves del catalogo son las del servidor, en el mismo orden", () => {
    const start = source.indexOf("export const MINI_CASE_IMAGE_OPTIONS");
    const end = source.indexOf("] as const;", start);
    const keys = [...source.slice(start, end).matchAll(/value: "([^"]+)"/g)].map((m) => m[1]);

    expect(keys).toEqual([...MINI_CASE_IMAGE_KEYS]);
  });

  it("la imagen por defecto es la misma y existe", () => {
    expect(source).toContain(`DEFAULT_MINI_CASE_IMAGE: MiniCaseImageKey = "${DEFAULT_MINI_CASE_IMAGE}";`);
    expect(isMiniCaseImageKey(DEFAULT_MINI_CASE_IMAGE)).toBe(true);
  });

  it("cada clave tiene su dibujo", () => {
    for (const key of MINI_CASE_IMAGE_KEYS) {
      expect(scenes, key).toMatch(new RegExp(`(^|\\n)\\s*"?${key}"?:`));
    }
  });

  it("no acepta claves desconocidas", () => {
    expect(isMiniCaseImageKey("pez")).toBe(false);
    expect(isMiniCaseImageKey(undefined)).toBe(false);
  });
});
