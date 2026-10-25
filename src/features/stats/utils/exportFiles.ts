import type { ChartResult } from "../types";
import { chartTable, exportFileName, sheetName, type TableCell } from "./chartTable";

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** El Excel de un grafico: solo su tabla, con numeros reales y la primera fila fija. */
export async function downloadExcel(result: ChartResult, single: boolean): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/universal");
  const { columns, rows } = chartTable(result, { single });

  const cell = (value: TableCell) => (value === null || value === "" ? null : value);
  const data = [
    columns.map((value) => ({ value, fontWeight: "bold" as const })),
    ...rows.map((row) => row.map(cell)),
  ];
  const widths = columns.map((column, c) =>
    Math.min(
      40,
      Math.max(10, column.length + 2, ...rows.map((row) => String(row[c] ?? "").length + 2)),
    ),
  );

  const blob = await writeXlsxFile(data, {
    sheet: sheetName(result.title),
    columns: widths.map((width) => ({ width })),
    stickyRowsCount: 1,
  }).toBlob();

  save(blob, `${exportFileName(result)}.xlsx`);
}

/** Lado mayor que los navegadores aguantan de forma segura en un canvas (Safari es el mas estricto). */
const MAX_CANVAS_AREA = 16_000_000;
const MAX_CANVAS_SIDE = 16_000;

/** Lo que define el aspecto de un trazo o un texto dentro de un SVG. */
const SVG_PROPERTIES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "paint-order",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
] as const;

/**
 * Los graficos pintan sus SVG con variables CSS (stroke="var(--viz-s1)") y con clases de
 * Tailwind (fill-[var(--viz-text)]). La copia que dibuja html-to-image no trae ni las
 * variables ni las hojas de estilo, y esos trazos saldrian negros o sin color. Mientras dura
 * la exportacion se escribe en cada elemento el estilo ya calculado. Devuelve la funcion que
 * deja el SVG como estaba.
 */
function freezeSvgStyles(node: HTMLElement): () => void {
  const previous: [SVGElement, string | null][] = [];

  for (const element of node.querySelectorAll<SVGElement>("svg *")) {
    const computed = getComputedStyle(element);

    previous.push([element, element.getAttribute("style")]);

    for (const property of SVG_PROPERTIES) element.style.setProperty(property, computed.getPropertyValue(property));
  }

  return () => {
    for (const [element, style] of previous) {
      if (style === null) element.removeAttribute("style");
      else element.setAttribute("style", style);
    }
  };
}

/**
 * El PDF de un grafico tal como se ve en pantalla: una sola pagina del tamaño del grafico,
 * sin los botones. Se dibuja con html-to-image (no html2canvas, que no entiende los colores
 * oklch de Tailwind v4).
 */
export async function downloadPdf(node: HTMLElement, result: ChartResult): Promise<void> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  // Se esconden los botones y la tabla se muestra entera, no solo la parte visible de su caja con scroll.
  node.dataset.exporting = "true";

  const previousWidth = node.style.width;
  // Una tabla ancha sale completa: la tarjeta se ensancha hasta que le cabe (padding y borde incluidos).
  const tables = Array.from(node.querySelectorAll<HTMLElement>("[data-export-expand] table"));
  const needed = Math.max(0, ...tables.map((table) => table.offsetWidth)) + 34;

  if (needed > node.clientWidth) node.style.width = `${needed}px`;

  const restorePaint = freezeSvgStyles(node);

  try {
    const width = node.scrollWidth;
    const height = node.scrollHeight;
    const ratio = Math.min(2, Math.sqrt(MAX_CANVAS_AREA / (width * height)), MAX_CANVAS_SIDE / Math.max(width, height));

    const image = await toPng(node, {
      pixelRatio: Math.max(ratio, 0.5),
      skipFonts: true,
      cacheBust: false,
    });

    const pdf = new jsPDF({
      orientation: width > height ? "landscape" : "portrait",
      unit: "px",
      format: [width, height],
      hotfixes: ["px_scaling"],
      compress: true,
    });

    pdf.addImage(image, "PNG", 0, 0, width, height);
    pdf.setProperties({ title: result.title });
    save(pdf.output("blob"), `${exportFileName(result)}.pdf`);
  } finally {
    restorePaint();
    node.style.width = previousWidth;
    delete node.dataset.exporting;
  }
}
