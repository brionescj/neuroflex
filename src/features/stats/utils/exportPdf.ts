import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { PrintSheet, type PrintSheetProps } from "../components/PrintSheet";
import { exportFileName } from "./chartTable";
import { saveBlob } from "./download";
import { LETTER, SHEET_PARTS, SHEET_WIDTH_PX, placeSheet, type Box, type SheetHeights } from "./printLayout";

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

export type PdfInput = Omit<PrintSheetProps, "single"> & { single: boolean };

/**
 * El PDF de un grafico: siempre una hoja carta vertical, con el grafico como maximo al 40 %
 * del alto, el «?» y «Cómo se calculó» desplegados y fondo blanco. La hoja se dibuja fuera de
 * pantalla con un ancho fijo, se fotografia por partes (encabezado, grafico, notas) con
 * html-to-image (no html2canvas: no entiende los colores oklch de Tailwind v4) y se arma con jsPDF.
 */
export async function downloadPdf(input: PdfInput): Promise<void> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  const host = document.createElement("div");

  // Fuera de la vista pero con medidas reales: los graficos se dibujan al ancho que miden.
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${SHEET_WIDTH_PX}px;pointer-events:none;`;
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    flushSync(() => root.render(createElement(PrintSheet, input)));
    await nextFrames();
    await document.fonts?.ready;
    await nextFrames();
    freezeSvgStyles(host);

    const part = (name: string) => host.querySelector<HTMLElement>(`[data-sheet-part="${name}"]`);
    const header = part(SHEET_PARTS.header);
    const plot = part(SHEET_PARTS.plot);
    const notes = part(SHEET_PARTS.notes);

    if (!header || !plot || !notes) throw new Error("No se pudo armar la hoja del PDF.");

    const heights: SheetHeights = {
      header: header.getBoundingClientRect().height,
      plot: plot.getBoundingClientRect().height,
      notes: notes.getBoundingClientRect().height,
    };
    const placement = placeSheet(heights);

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [LETTER.width, LETTER.height], compress: true });

    const parts: [HTMLElement, Box | null][] = [
      [header, placement.header],
      [plot, placement.plot],
      [notes, placement.notes],
    ];

    for (const [element, box] of parts) {
      if (box === null) continue;

      const { width, height } = element.getBoundingClientRect();
      const ratio = Math.min(PIXEL_RATIO, Math.sqrt(MAX_CANVAS_AREA / (width * height)));
      const image = await toPng(element, { pixelRatio: ratio, skipFonts: true, backgroundColor: "#ffffff" });

      pdf.addImage(image, "PNG", box.x, box.y, box.width, box.height);
    }

    pdf.setProperties({ title: input.result.title });
    saveBlob(pdf.output("blob"), `${exportFileName(input.full)}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}
