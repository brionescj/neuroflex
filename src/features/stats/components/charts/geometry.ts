/** Trazados y medidas compartidas por los graficos. */

/** Alto aproximado de un caracter de 11 px, para decidir si una etiqueta cabe. */
export const CHAR_PX = 6.3;

export function textWidth(text: string): number {
  return text.length * CHAR_PX;
}

/** Parte un texto en lineas de hasta `maxChars` caracteres, sin cortar palabras. */
export function wrapLabel(text: string, maxChars: number, maxLines = 2): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current === "" ? word : `${current} ${word}`;

    if (next.length <= maxChars || current === "") {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current !== "") lines.push(current);

  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1] as string;

  kept[maxLines - 1] = `${last.slice(0, Math.max(maxChars - 1, 1)).trimEnd()}…`;

  return kept;
}

/** Columna con el extremo superior redondeado (4 px) y la base recta. */
export function columnPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(4, width / 2, height);

  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    "Z",
  ].join(" ");
}

/** Barra horizontal con el extremo derecho redondeado y la base recta. */
export function barPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(4, height / 2, width);

  return [
    `M${x},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height - r}`,
    `Q${x + width},${y + height} ${x + width - r},${y + height}`,
    `H${x}`,
    "Z",
  ].join(" ");
}

/** Cuantas etiquetas saltar para que ninguna pise a la siguiente. */
export function labelStep(count: number, plotWidth: number, labelWidth: number): number {
  if (count <= 1) return 1;

  const slot = plotWidth / count;

  return Math.max(1, Math.ceil((labelWidth + 6) / slot));
}
