import type { SequenceColorId } from "./colorSequenceConfig";

/**
 * Cada color tiene dos caras: apagado (oscuro, para que al encenderse el cambio se note) y encendido
 * (tono claro con resplandor, "fosforescente"). El resplandor es un box-shadow del mismo color.
 */
export const SEQUENCE_COLORS: Array<{
  id: SequenceColorId;
  label: string;
  offClassName: string;
  litClassName: string;
}> = [
  {
    id: "blue",
    label: "Azul",
    offClassName: "bg-sky-700",
    litClassName: "bg-sky-300 shadow-[0_0_36px_10px_rgba(56,189,248,0.8)]",
  },
  {
    id: "green",
    label: "Verde",
    offClassName: "bg-emerald-700",
    litClassName: "bg-emerald-300 shadow-[0_0_36px_10px_rgba(52,211,153,0.8)]",
  },
  {
    id: "orange",
    label: "Naranja",
    offClassName: "bg-amber-700",
    litClassName: "bg-amber-300 shadow-[0_0_36px_10px_rgba(251,191,36,0.8)]",
  },
  {
    id: "red",
    label: "Rojo",
    offClassName: "bg-rose-700",
    litClassName: "bg-rose-300 shadow-[0_0_36px_10px_rgba(251,113,133,0.8)]",
  },
];
