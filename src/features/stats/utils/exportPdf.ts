import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { PrintSheet, type PrintSheetProps } from "../components/PrintSheet";
import { saveBlob } from "./download";
import { LETTER, SHEET_WIDTH_PX, flowSheet, type FlowBlock } from "./printLayout";

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
 * variables ni las hojas de estilo, y esos trazos saldrian negros o sin color: por eso se
 * escribe en cada elemento el estilo ya calculado.
 */
function freezeSvgStyles(root: HTMLElement) {
  for (const element of root.querySelectorAll<SVGElement>("svg *")) {
    const computed = getComputedStyle(element);

    for (const property of SVG_PROPERTIES) element.style.setProperty(property, computed.getPropertyValue(property));
  }
}

/** Dos cuadros de animacion: lo que usan los graficos (ResizeObserver) para medirse y dibujarse. */
function nextFrames(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/** Lado mayor y area que los navegadores aguantan de forma segura en un canvas (Safari es el mas estricto). */
const MAX_CANVAS_AREA = 16_000_000;
/** 3 pixeles por pixel: unos 290 ppp en la hoja, de sobra para imprimir. */
const PIXEL_RATIO = 3;

export type PdfInput = PrintSheetProps & {
  /** Nombre del archivo, sin la extension. */
  fileName: string;
};

/**
 * El PDF de un grafico o de un resumen: hojas carta verticales (casi siempre una), con el
 * grafico como maximo al 40 % del alto, el «?» y «Cómo se calculó» desplegados, las listas de
 * estudiantes al final del resumen y fondo blanco. La hoja se dibuja fuera de pantalla con un
 * ancho fijo, se fotografia por partes con html-to-image (no html2canvas: no entiende los
 * colores oklch de Tailwind v4) y se arma con jsPDF.
 */
export async function downloadPdf({ fileName, ...sheet }: PdfInput): Promise<void> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  const host = document.createElement("div");

  // Fuera de la vista pero con medidas reales: los graficos se dibujan al ancho que miden.
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${SHEET_WIDTH_PX}px;pointer-events:none;`;
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    flushSync(() => root.render(createElement(PrintSheet, sheet)));
    await nextFrames();
    await document.fonts?.ready;
    await nextFrames();
    freezeSvgStyles(host);

    const parts = Array.from(host.querySelectorAll<HTMLElement>("[data-sheet-part]"));

    if (parts.length === 0) throw new Error("No se pudo armar la hoja del PDF.");

    const blocks: FlowBlock[] = parts.map((element, i) => ({
      id: String(i),
      kind: element.dataset.sheetKind === "plot" ? "plot" : "text",
      height: element.getBoundingClientRect().height,
    }));
    const placed = flowSheet(blocks);

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [LETTER.width, LETTER.height], compress: true });
    let page = 0;

    for (const block of placed) {
      const element = parts[Number(block.id)];

      if (!element) continue;

      while (page < block.page) {
        pdf.addPage([LETTER.width, LETTER.height], "portrait");
        page += 1;
      }

      const { width, height } = element.getBoundingClientRect();
      const ratio = Math.min(PIXEL_RATIO, Math.sqrt(MAX_CANVAS_AREA / (width * height)));
      const image = await toPng(element, { pixelRatio: ratio, skipFonts: true, backgroundColor: "#ffffff" });

      pdf.addImage(image, "PNG", block.box.x, block.box.y, block.box.width, block.box.height);
    }

    pdf.setProperties({ title: sheet.title });
    saveBlob(pdf.output("blob"), `${fileName}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}
