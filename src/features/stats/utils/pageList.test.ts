import { describe, expect, it } from "vitest";

import { pageItems } from "./pageList";

describe("pageItems", () => {
  it("con pocas páginas muestra todas", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 3)).toEqual([1, 2, 3]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("al comienzo salta hacia el final", () => {
    expect(pageItems(1, 20)).toEqual([1, 2, 3, 4, 5, "gap-end", 20]);
    expect(pageItems(4, 20)).toEqual([1, 2, 3, 4, 5, "gap-end", 20]);
  });

  it("en el medio muestra la actual con sus vecinas", () => {
    expect(pageItems(10, 20)).toEqual([1, "gap-start", 9, 10, 11, "gap-end", 20]);
    expect(pageItems(5, 20)).toEqual([1, "gap-start", 4, 5, 6, "gap-end", 20]);
  });

  it("al final salta desde el comienzo", () => {
    expect(pageItems(17, 20)).toEqual([1, "gap-start", 16, 17, 18, 19, 20]);
    expect(pageItems(20, 20)).toEqual([1, "gap-start", 16, 17, 18, 19, 20]);
  });

  it("siempre son 7 casillas con más de 7 páginas, y la página actual está entre ellas", () => {
    for (const pages of [8, 9, 15, 100]) {
      for (let page = 1; page <= pages; page++) {
        const items = pageItems(page, pages);

        expect(items, `${page}/${pages}`).toHaveLength(7);
        expect(items).toContain(page);
        expect(items[0]).toBe(1);
        expect(items.at(-1)).toBe(pages);
      }
    }
  });

  it("nunca repite ni desordena números", () => {
    for (let page = 1; page <= 30; page++) {
      const numbers = pageItems(page, 30).filter((item): item is number => typeof item === "number");

      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });
});
