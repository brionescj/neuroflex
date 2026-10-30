import { describe, expect, it } from "vitest";

import { groupsOf, groupsSignature, showOnly, subgroupsOf, toggleGroup, toggleSubgroup, withoutGroups } from "./groups";
import type { ChartResult } from "../types";

function result(extra: Partial<ChartResult> = {}): ChartResult {
  return {
    chart: "cs-max-level",
    title: "Nivel máximo superado",
    views: ["bars"],
    exploratory: false,
    xLabel: "Nivel",
    yLabel: "Estudiantes",
    unit: "students",
    unitLabel: "estudiantes",
    categories: ["1", "2"],
    series: [
      { key: "mobile", label: "Celular", slot: 0, n: 4, values: [1, 2], ns: [1, 2] },
      { key: "tablet", label: "Tableta", slot: 1, n: 3, values: [3, 4], ns: [3, 4] },
      { key: "desktop", label: "Computador", slot: 2, n: 5, values: [5, 6], ns: [5, 6] },
    ],
    warnings: [],
    notes: [],
    studentsTotal: 12,
    generatedAt: "2026-10-21T15:00:00.000Z",
    ...extra,
  };
}

describe("grupos comparados", () => {
  it("los grupos salen de las series, con su color", () => {
    expect(groupsOf(result()).map((g) => [g.key, g.slot])).toEqual([
      ["mobile", 0],
      ["tablet", 1],
      ["desktop", 2],
    ]);
  });

  it("en un resumen en tarjetas salen de las tarjetas", () => {
    const cards = [
      { group: "UVM", slot: 1, items: [] },
      { group: "Santo Tomás", slot: 0, items: [] },
    ];

    expect(groupsOf(result({ series: [], cards })).map((g) => g.key)).toEqual(["UVM", "Santo Tomás"]);
  });

  it("quitar un grupo no cambia los valores ni el color de los demas", () => {
    const shown = withoutGroups(result(), new Set(["tablet"]));

    expect(shown.series.map((s) => [s.key, s.slot, s.values])).toEqual([
      ["mobile", 0, [1, 2]],
      ["desktop", 2, [5, 6]],
    ]);
  });

  it("sin grupos ocultos devuelve el mismo resultado", () => {
    const full = result();

    expect(withoutGroups(full, new Set())).toBe(full);
  });

  it("en el resumen quita tambien la columna del grupo en la tabla", () => {
    const full = result({
      series: [],
      cards: [
        { group: "UVM", slot: 1, items: [] },
        { group: "Santo Tomás", slot: 0, items: [] },
      ],
      table: { columns: ["Indicador", "UVM", "Santo Tomás"], rows: [["Habilitados", 4, 6]] },
    });
    const shown = withoutGroups(full, new Set(["UVM"]));

    expect(shown.cards?.map((c) => c.group)).toEqual(["Santo Tomás"]);
    expect(shown.table).toEqual({ columns: ["Indicador", "Santo Tomás"], rows: [["Habilitados", 6]] });
  });

  it("ocultar y volver a mostrar; el ultimo visible no se puede ocultar", () => {
    const groups = groupsOf(result());
    const a = toggleGroup(new Set(), groups, "tablet");

    expect([...a]).toEqual(["tablet"]);
    expect([...toggleGroup(a, groups, "tablet")]).toEqual([]);

    const b = toggleGroup(a, groups, "mobile");

    expect([...b].sort()).toEqual(["mobile", "tablet"]);
    // Solo queda «Computador»: no se oculta.
    expect([...toggleGroup(b, groups, "desktop")].sort()).toEqual(["mobile", "tablet"]);
  });

  it("la firma cambia cuando cambian los grupos", () => {
    const one = groupsSignature(groupsOf(result()));
    const two = groupsSignature(groupsOf(result({ series: result().series.slice(0, 2) })));

    expect(one).not.toBe(two);
  });
});

describe("panel de bloques por grupo (casos × grupos)", () => {
  const cards = [
    { group: "Mini Caso 1 - UVM", slot: 0, subgroup: "UVM", items: [] },
    { group: "Mini Caso 1 - Santo Tomás", slot: 1, subgroup: "Santo Tomás", items: [] },
    { group: "Mini Caso 2 - UVM", slot: 0, subgroup: "UVM", items: [] },
    { group: "Mini Caso 2 - Santo Tomás", slot: 1, subgroup: "Santo Tomás", items: [] },
  ];
  const full = result({
    series: [],
    cards,
    groupPanel: "Mini casos",
    table: {
      columns: ["Caso", "Grupo"],
      rows: [["Mini Caso 1", "UVM"], ["Mini Caso 1", "Santo Tomás"], ["Mini Caso 2", "UVM"], ["Mini Caso 2", "Santo Tomás"]],
      rowGroups: cards.map((card) => card.group),
    },
  });

  it("agrupa los bloques por grupo comparado, con su color", () => {
    expect(subgroupsOf(full)).toEqual([
      { label: "UVM", slot: 0, keys: ["Mini Caso 1 - UVM", "Mini Caso 2 - UVM"] },
      { label: "Santo Tomás", slot: 1, keys: ["Mini Caso 1 - Santo Tomás", "Mini Caso 2 - Santo Tomás"] },
    ]);
    expect(subgroupsOf(result())).toEqual([]);
  });

  it("quitar un bloque quita también sus filas de la tabla", () => {
    const shown = withoutGroups(full, new Set(["Mini Caso 1 - UVM"]));

    expect(shown.cards?.map((card) => card.group)).toHaveLength(3);
    expect(shown.table?.rows).toEqual([["Mini Caso 1", "Santo Tomás"], ["Mini Caso 2", "UVM"], ["Mini Caso 2", "Santo Tomás"]]);
    expect(shown.table?.rowGroups).not.toContain("Mini Caso 1 - UVM");
  });

  it("quita o vuelve a poner todos los casos de un grupo, sin dejar el gráfico vacío", () => {
    const groups = groupsOf(full);
    const [uvm, santoTomas] = subgroupsOf(full);
    const hiddenUvm = toggleSubgroup(new Set(), groups, uvm!.keys);

    expect([...hiddenUvm].sort()).toEqual(["Mini Caso 1 - UVM", "Mini Caso 2 - UVM"]);
    expect([...toggleSubgroup(hiddenUvm, groups, uvm!.keys)]).toEqual([]);
    // Quitar también el otro grupo dejaría todo oculto: no se hace.
    expect([...toggleSubgroup(hiddenUvm, groups, santoTomas!.keys)].sort()).toEqual([...hiddenUvm].sort());
  });

  it("«solo UVM» deja a la vista únicamente los casos de ese grupo", () => {
    const [uvm] = subgroupsOf(full);

    expect([...showOnly(groupsOf(full), uvm!.keys)].sort()).toEqual(["Mini Caso 1 - Santo Tomás", "Mini Caso 2 - Santo Tomás"]);
  });
});
