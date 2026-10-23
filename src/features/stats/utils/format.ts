import type { ChartUnit } from "../types";

const number = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return number.format(value);
}

/** Etiqueta del eje: 1000 se escribe 1K. */
export function formatTick(value: number): string {
  if (Math.abs(value) >= 1000) {
    const thousands = value / 1000;

    return `${number.format(thousands)}K`;
  }

  return number.format(value);
}

/** 75 s -> "1 min 15 s"; menos de un minuto -> "45 s". */
export function formatSeconds(seconds: number): string {
  const rounded = Math.round(seconds);

  if (rounded < 60) return `${number.format(seconds)} s`;

  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;

  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

/** Valor para el tooltip y la tabla, con su unidad. */
export function formatValue(value: number, unit: ChartUnit): string {
  switch (unit) {
    case "percent":
      return `${number.format(value)} %`;
    case "seconds":
      return formatSeconds(value);
    case "steps":
      return number.format(value);
    default:
      return integer.format(value);
  }
}
