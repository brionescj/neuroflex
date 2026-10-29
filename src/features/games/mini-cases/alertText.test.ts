import { describe, expect, it } from "vitest";

import { withoutAlertPrefix } from "./alertText";

describe("withoutAlertPrefix", () => {
  it("quita el aviso repetido al comienzo, sin importar mayúsculas", () => {
    expect(withoutAlertPrefix("¡Alerta de Cambio! El estudiante extravía su set.")).toBe("El estudiante extravía su set.");
    expect(withoutAlertPrefix("¡ALERTA DE CAMBIO!   Algo.")).toBe("Algo.");
  });

  it("deja intacto un texto que no lo trae o lo menciona más adelante", () => {
    expect(withoutAlertPrefix("El profesor avisa: ¡alerta de cambio! hoy.")).toBe("El profesor avisa: ¡alerta de cambio! hoy.");
    expect(withoutAlertPrefix("Se interrumpe la sesión.")).toBe("Se interrumpe la sesión.");
  });
});
