import { describe, expect, it } from "vitest";

import { nextCaseKey, parseMiniCaseInput } from "./miniCaseInput";

const valid = {
  title: "Área de Lenguaje y Comunicación",
  imageKey: "biblioteca",
  baseText: "Un caso.",
  twistText: "¡Alerta de Cambio! Algo cambia.",
  promptText: "Ordena del 1 al 4:",
  feedback: "Porque sí.",
  options: [
    { text: "Primero", correctStep: 1 },
    { text: "Segundo", correctStep: 2 },
    { text: "Tercero", correctStep: 3 },
    { text: "Cuarto", correctStep: 4 },
  ],
};

describe("parseMiniCaseInput", () => {
  it("acepta un caso completo y recorta los espacios", () => {
    const parsed = parseMiniCaseInput({ ...valid, title: "  Área   de  Lenguaje  " });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.title).toBe("Área de Lenguaje");
  });

  it.each([
    ["título", { title: "  " }, "título"],
    ["caso", { baseText: undefined }, "caso"],
    ["alerta", { twistText: "" }, "alerta"],
    ["consigna", { promptText: 3 }, "consigna"],
    ["retroalimentación", { feedback: "" }, "retroalimentación"],
  ])("exige el %s", (_name, patch, word) => {
    const parsed = parseMiniCaseInput({ ...valid, ...patch });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toContain(word);
  });

  it("exige 4 alternativas con lugares distintos del 1 al 4", () => {
    expect(parseMiniCaseInput({ ...valid, options: valid.options.slice(0, 3) }).ok).toBe(false);
    expect(
      parseMiniCaseInput({
        ...valid,
        options: valid.options.map((o) => ({ ...o, correctStep: 1 })),
      }).ok,
    ).toBe(false);
    expect(
      parseMiniCaseInput({
        ...valid,
        options: valid.options.map((o, i) => (i === 3 ? { ...o, correctStep: 5 } : o)),
      }).ok,
    ).toBe(false);
  });

  it("rechaza alternativas vacías o con claves repetidas", () => {
    expect(
      parseMiniCaseInput({
        ...valid,
        options: valid.options.map((o, i) => (i === 0 ? { ...o, text: " " } : o)),
      }).ok,
    ).toBe(false);
    expect(
      parseMiniCaseInput({
        ...valid,
        options: valid.options.map((o) => ({ ...o, optionKey: "caso-1-a" })),
      }).ok,
    ).toBe(false);
  });

  it("valida la imagen contra el catálogo y la clave del caso", () => {
    expect(parseMiniCaseInput({ ...valid, imageKey: "pez" }).ok).toBe(false);
    expect(parseMiniCaseInput({ ...valid, imageKey: undefined }).ok).toBe(true);
    expect(parseMiniCaseInput({ ...valid, caseKey: "../x" }).ok).toBe(false);
    expect(parseMiniCaseInput({ ...valid, caseKey: "caso-12" }).ok).toBe(true);
  });

  it("limita el largo de los textos", () => {
    expect(parseMiniCaseInput({ ...valid, title: "x".repeat(121) }).ok).toBe(false);
    expect(parseMiniCaseInput({ ...valid, baseText: "x".repeat(1501) }).ok).toBe(false);
  });

  it("no revienta con un cuerpo que no es un objeto", () => {
    expect(parseMiniCaseInput(null).ok).toBe(false);
    expect(parseMiniCaseInput("hola").ok).toBe(false);
  });
});

describe("parseMiniCaseInput: otros órdenes correctos", () => {
  const steps = (alternateSteps: unknown) => parseMiniCaseInput({ ...valid, alternateSteps });

  it("acepta órdenes por lugar y una lista vacía (quita los que había)", () => {
    const one = steps([[3, 1, 2, 4]]);
    const none = steps([]);

    expect(one.ok && one.value.alternateSteps).toEqual([[3, 1, 2, 4]]);
    expect(none.ok && none.value.alternateSteps).toEqual([]);
    expect(parseMiniCaseInput(valid).ok && "alternateSteps" in (parseMiniCaseInput(valid) as { value: object }).value).toBe(false);
  });

  it.each([
    ["no es lista", "3124", /lista/],
    ["incompleto", [[3, 1, 2]], /4 alternativas/],
    ["repite una alternativa", [[3, 3, 2, 4]], /una vez cada una/],
    ["fuera de rango", [[5, 1, 2, 4]], /una vez cada una/],
    ["igual al principal", [[1, 2, 3, 4]], /repite otro orden/],
    ["dos órdenes, aunque sean distintos", [[2, 1, 3, 4], [3, 1, 2, 4]], /un solo otro orden/],
    ["dos iguales", [[3, 1, 2, 4], [3, 1, 2, 4]], /un solo otro orden/],
  ])("rechaza un orden %s", (_label, value, message) => {
    const parsed = steps(value);

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toMatch(message);
  });
});

describe("nextCaseKey", () => {
  it("toma uno más que el mayor número", () => {
    expect(nextCaseKey(["caso-1", "caso-10", "caso-9"])).toBe("caso-11");
  });

  it("empieza en caso-1 si no hay casos", () => {
    expect(nextCaseKey([])).toBe("caso-1");
  });
});
