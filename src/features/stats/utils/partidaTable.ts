import type { PartidaDetail, PartidaItem } from "../types";

const itemText = (item: PartidaItem) => (item.ok === false ? `${item.text} ✗` : item.text);

/** Un tiempo en segundos, con coma decimal («12,3 s»). */
export const secondsText = (value: number) => `${value.toLocaleString("es-CL", { maximumFractionDigits: 1 })} s`;

/** El tiempo total de los niveles o casos de la partida, en minutos y segundos. */
export function totalTimeText(detail: PartidaDetail): string {
  const total = Math.round(detail.rows.reduce((sum, row) => sum + row.seconds, 0));
  const minutes = Math.floor(total / 60);

  return minutes === 0 ? `${total} s` : `${minutes} min ${String(total % 60).padStart(2, "0")} s`;
}

/** Cuántos niveles o casos trae el detalle, con su palabra: «5 niveles», «1 caso». */
export function unitsText(detail: PartidaDetail): string {
  // Un nivel con varios intentos cuenta una vez.
  const count = new Set(detail.rows.map((row) => row.label)).size;
  const word = detail.game === "mini-cases" ? (count === 1 ? "caso" : "casos") : count === 1 ? "nivel" : "niveles";

  return `${count} ${word}`;
}

/**
 * El detalle como una tabla de texto, para el PDF (que corta las filas largas entre hojas): una fila por
 * nivel o caso; una columna por cada secuencia (lo pedido, lo marcado) y una última con los datos sueltos.
 */
export function partidaTable(detail: PartidaDetail): { columns: string[]; rows: (string | number | null)[][] } {
  const lineTitles: string[] = [];

  for (const row of detail.rows) {
    for (const line of row.lines) if (!lineTitles.includes(line.title)) lineTitles.push(line.title);
  }

  const withTry = detail.rows.some((row) => row.tryText !== null);

  return {
    columns: [
      detail.game === "mini-cases" ? "Caso" : "Nivel",
      ...(withTry ? ["Intento"] : []),
      "Resultado",
      "Tiempo",
      ...lineTitles,
      "Datos",
    ],
    rows: detail.rows.map((row) => [
      row.label,
      ...(withTry ? [row.tryText ?? ""] : []),
      row.result,
      secondsText(row.seconds),
      ...lineTitles.map((title) => row.lines.find((line) => line.title === title)?.items.map(itemText).join(" · ") ?? ""),
      row.notice ?? row.facts.map((fact) => `${fact.label}: ${fact.value}`).join(" · "),
    ]),
  };
}
