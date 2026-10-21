import { describe, expect, it } from "vitest";

import { responseFromError } from "./apiError";

describe("responseFromError", () => {
  it("respeta la respuesta de la API cuando trae mensaje", () => {
    const data = { success: false, message: "RUT o contraseña incorrectos.", data: null };

    expect(responseFromError({ status: 401, data })).toBe(data);
  });

  it("si la respuesta no es JSON (pagina de error, texto), da un mensaje con el codigo HTTP", () => {
    for (const data of ["<html>NOT_FOUND</html>", "Error: boom\n    at x", "", undefined, null]) {
      const result = responseFromError({ status: 404, data });

      expect(result.success).toBe(false);
      expect(result.message).toContain("404");
      expect(result.data).toBeNull();
    }
  });

  it("si es un objeto sin mensaje valido, tampoco deja el aviso vacio", () => {
    for (const data of [{}, { success: false }, { success: false, message: "" }, { message: "x" }]) {
      expect(responseFromError({ status: 500, data }).message).toContain("500");
    }
  });
});
