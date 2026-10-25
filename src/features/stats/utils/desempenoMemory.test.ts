import { afterEach, describe, expect, it } from "vitest";

import { forgetDesempeno, recallDesempeno, rememberDesempeno, type DesempenoMemory } from "./desempenoMemory";

const base: DesempenoMemory = {
  owner: "11111111-1",
  rut: "22222222-2",
  choosing: false,
  query: "soto",
  page: 1,
  catalog: null,
  profile: null,
  choice: { rut: "", states: {} },
};

afterEach(forgetDesempeno);

describe("desempenoMemory", () => {
  it("devuelve lo guardado al mismo administrador", () => {
    rememberDesempeno(base);

    expect(recallDesempeno("11111111-1")).toEqual(base);
  });

  it("no le entrega nada a otro administrador", () => {
    rememberDesempeno(base);

    expect(recallDesempeno("33333333-3")).toBeNull();
  });

  it("sin nada guardado devuelve null, y olvidar lo deja vacío", () => {
    expect(recallDesempeno("11111111-1")).toBeNull();

    rememberDesempeno(base);
    forgetDesempeno();

    expect(recallDesempeno("11111111-1")).toBeNull();
  });
});
