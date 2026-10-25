import { describe, expect, it } from "vitest";

import { listsOfCards } from "./cardLists";
import type { ChartCards } from "../types";

const COLUMNS = ["Estudiante", "RUT"];

const cards: ChartCards = [
  {
    group: "Todos los estudiantes",
    slot: 0,
    items: [
      { label: "Estudiantes habilitados", value: "39" },
      {
        label: "Han jugado al menos una vez",
        value: "37",
        lists: [{ title: "Quiénes no han jugado", columns: COLUMNS, rows: [["Ana", "1-9"], ["Luis", "2-7"]] }],
      },
      {
        label: "Con Mini casos desbloqueado",
        value: "31",
        lists: [
          { title: "Quiénes no lo han desbloqueado", columns: COLUMNS, rows: [["Pedro", "3-5"]] },
          { title: "Quiénes ya lo desbloquearon", columns: COLUMNS, rows: [] },
        ],
      },
    ],
  },
];

describe("listsOfCards", () => {
  it("junta todas las listas con gente, en el orden de las tarjetas, con su cantidad", () => {
    const lists = listsOfCards(cards);

    expect(lists.map((list) => list.title)).toEqual([
      "Quiénes no han jugado (2) · Han jugado al menos una vez",
      "Quiénes no lo han desbloqueado (1) · Con Mini casos desbloqueado",
    ]);
    expect(lists[0]?.rows).toHaveLength(2);
  });

  it("omite las listas vacías", () => {
    expect(listsOfCards(cards).some((list) => list.title.includes("ya lo desbloquearon"))).toBe(false);
  });

  it("al comparar grupos, dice de qué grupo es cada lista", () => {
    const two: ChartCards = [
      { ...cards[0]!, group: "Paralelo 1" },
      { ...cards[0]!, group: "Paralelo 2", slot: 1 },
    ];

    expect(listsOfCards(two)[0]?.title.startsWith("Paralelo 1 · ")).toBe(true);
    expect(listsOfCards(two)[2]?.title.startsWith("Paralelo 2 · ")).toBe(true);
  });

  it("un resumen sin listas no imprime ninguna", () => {
    expect(listsOfCards([{ group: "Resumen", slot: 0, items: [{ label: "Partidas", value: "3" }] }])).toEqual([]);
  });
});
