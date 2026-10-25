import { describe, expect, it } from "vitest";

import { formatNameInput, sanitizeNameInput } from "./sanitizeInput";

describe("sanitizeNameInput", () => {
  it("deja solo letras (con tildes y ñ) y espacios", () => {
    expect(sanitizeNameInput("José 3 Ñuñoa-#")).toBe("José  Ñuñoa");
  });
});

describe("formatNameInput", () => {
  it("la inicial de cada palabra en mayuscula y el resto en minuscula", () => {
    expect(formatNameInput("camiLo andres")).toBe("Camilo Andres");
    expect(formatNameInput("CAMILO ANDRES")).toBe("Camilo Andres");
    expect(formatNameInput("maría josé")).toBe("María José");
  });

  it("mientras se escribe conserva el espacio final, para poder seguir con la palabra siguiente", () => {
    expect(formatNameInput("camilo ")).toBe("Camilo ");
    expect(formatNameInput("camilo a")).toBe("Camilo A");
  });

  it("quita simbolos, numeros, espacios iniciales y espacios repetidos", () => {
    expect(formatNameInput("  camilo   an3dres#")).toBe("Camilo Andres");
  });
});
