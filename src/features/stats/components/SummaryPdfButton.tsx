import { FileText, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { chartDay } from "../utils/chartTable";
import type { StudentProfile } from "../types";
import { StatCards } from "./charts/StatCards";

/** El PDF del resumen de un estudiante: las mismas tarjetas, en hoja carta y con «Cómo se calculó» desplegado. */
export function SummaryPdfButton({ profile }: { profile: StudentProfile }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    if (busy) return;

    setBusy(true);

    try {
      const { downloadPdf } = await import("../utils/exportPdf");
      const { student } = profile;

      await downloadPdf({
        fileName: `neuroflex-resumen-${student.rut}-${chartDay()}`,
        title: "Resumen del desempeño",
        subtitle: [student.name, student.rut, student.paralelo === null ? "" : `Paralelo ${student.paralelo}`, student.university]
          .filter((part) => part !== "")
          .join(" · "),
        description: "",
        exploratory: false,
        warnings: [],
        plot: <StatCards cards={profile.cards} />,
        lists: [],
        calcTitle: "Cómo se calculó",
        notes: profile.notes,
        single: true,
      });
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={busy}
      aria-label="Descargar resumen en PDF"
      title="Descargar resumen en PDF"
      className="flex size-11 items-center justify-center rounded-lg border border-white/10 text-[var(--viz-text-2)] hover:bg-white/5 disabled:opacity-50"
    >
      {busy ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <FileText aria-hidden="true" className="size-4" />
      )}
    </button>
  );
}
