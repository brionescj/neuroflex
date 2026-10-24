import { describe, expect, it } from "vitest";

import { dataMaxOf, niceStep, valueScale } from "./scale";

describe("niceStep", () => {
  it("elige pasos redondos que dejan unas 4 divisiones", () => {
    expect(niceStep(10)).toBe(2.5);
    expect(niceStep(40)).toBe(10);
    expect(niceStep(7)).toBe(2);
    expect(niceStep(1200)).toBe(500);
    expect(niceStep(0.4)).toBe(0.1);
  });

  it("sin datos devuelve 1", () => {
    expect(niceStep(0)).toBe(1);
  });
});

describe("valueScale", () => {
  it("porcentajes altos: de 0 a 100", () => {
    expect(valueScale("percent", 72)).toEqual({ max: 100, ticks: [0, 25, 50, 75, 100] });
  });

  it("porcentajes chicos: se amplia la escala, sin pasar de 100", () => {
    const scale = valueScale("percent", 12);

    expect(scale.max).toBeLessThan(100);
    expect(scale.max).toBeGreaterThanOrEqual(12);
    expect(valueScale("percent", 50).max).toBeLessThanOrEqual(100);
  });

  it("pasos de mini casos: de 0 a 4", () => {
    expect(valueScale("steps", 1).max).toBe(4);
  });

  it("veces (reinicios): el eje llega al maximo aunque pase de 4", () => {
    const scale = valueScale("count", 18);

    expect(scale.ticks[0]).toBe(0);
    expect(scale.max).toBeGreaterThanOrEqual(18);
  });

  it("cantidades: parte de 0 y cubre el maximo", () => {
    const scale = valueScale("students", 37);

    expect(scale.ticks[0]).toBe(0);
    expect(scale.max).toBeGreaterThanOrEqual(37);
    expect(scale.ticks[scale.ticks.length - 1]).toBe(scale.max);
  });

  it("sin datos igual da una escala dibujable", () => {
    const scale = valueScale("seconds", 0);

    expect(scale.max).toBeGreaterThan(0);
    expect(scale.ticks.length).toBeGreaterThan(1);
  });

  it("no arrastra errores de coma flotante", () => {
    expect(valueScale("seconds", 0.3).ticks.every((t) => Number.isInteger(t * 100))).toBe(true);
  });
});

describe("dataMaxOf", () => {
  it("ignora los vacios", () => {
    expect(dataMaxOf([{ values: [null, 3, 7] }, { values: [5, null] }])).toBe(7);
    expect(dataMaxOf([{ values: [null] }])).toBe(0);
    expect(dataMaxOf([])).toBe(0);
  });
});
