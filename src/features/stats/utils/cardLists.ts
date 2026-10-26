import type { ChartCards } from "../types";

/** Una lista de estudiantes lista para imprimir. */
export type PrintList = { title: string; columns: string[]; rows: (string | number | null)[][] };

/**
 * Las listas de estudiantes de un resumen en tarjetas (quienes no han jugado, quienes no han
 * desbloqueado Mini casos, quienes si…), todas, en el orden de las tarjetas. En pantalla se
 * abren de a una al tocar; en el PDF van todas, al final del resumen. Una lista sin nadie no
 * se imprime: la tarjeta ya dice que son 0.
 */
export function listsOfCards(cards: ChartCards): PrintList[] {
  return cards.flatMap((block) =>
    block.items.flatMap((item) =>
      (item.lists ?? [])
        .filter((list) => list.rows.length > 0)
        .map((list) => ({
          title: `${cards.length > 1 ? `${block.group} · ` : ""}${list.title} (${list.rows.length}) · ${item.label}${list.note ? ` (${list.note})` : ""}`,
          columns: list.columns,
          rows: list.rows,
        })),
    ),
  );
}

/**
 * Las mismas listas, una por hoja de Excel. El nombre de una hoja admite 31 caracteres, sin
 * `\ / ? * [ ] :`, y no puede repetirse: si dos quedan iguales se les agrega un numero.
 */
export function cardListSheets(cards: ChartCards): PrintList[] {
  const used = new Set<string>();

  return cards.flatMap((block) =>
    block.items.flatMap((item) =>
      (item.lists ?? [])
        .filter((list) => list.rows.length > 0)
        .map((list) => {
          const base = (cards.length > 1 ? `${block.group} ${list.title}` : list.title)
            .replace(/[\\/?*[\]:]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 31);
          let name = base === "" ? "Lista" : base;

          for (let n = 2; used.has(name.toLowerCase()); n++) {
            const suffix = ` ${n}`;

            name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
          }

          used.add(name.toLowerCase());

          return { title: name, columns: list.columns, rows: list.rows };
        }),
    ),
  );
}
