import { Download, FileSpreadsheet } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { RegionCommuneFields } from "@/components/forms/RegionCommuneFields";
import { Button } from "@/components/ui/Button";
import { Field, FieldLabel } from "@/components/ui/Field";
import { PARALELO_OPTIONS, UNIVERSITY_OPTIONS, universityLabel } from "@/config/studentOptions";
import { saveBlob } from "@/features/stats/utils/download";
import type { Paralelo, StudentImportReport, StudentImportRow, StudentImportRowResult, University } from "@/types";
import { officialCommune, placeForSelects } from "@/utils/commune";

import { importStudentsAction } from "../actions/students.action";
import { downloadImportWarningsExcel, type ImportWarningsContext } from "../utils/importWarningsExcel";
import { applyPlaceFix, hasPlaceWarning } from "../utils/importPlaceFix";
import { importTemplateBlob, readImportFile } from "../utils/studentImportFile";

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-white";

type Step =
  | { name: "choose" }
  | { name: "review"; rows: StudentImportRow[]; report: StudentImportReport; fixed: number[] }
  | { name: "done"; report: StudentImportReport };

type StudentImportDialogProps = {
  onClose: () => void;
  /** Se avisa al terminar una carga, para que la lista se actualice. */
  onImported: () => void;
};

/**
 * Carga masiva de estudiantes desde un Excel (.xlsx) con las columnas NOMBRE, RUT, FECHA_NACIMIENTO, EMAIL, CELULAR,
 * COMUNA, REGION, JORNADA y GENERO. La universidad y el paralelo no vienen en el archivo: se eligen una vez para todos.
 * Primero se revisa el archivo (nada se guarda) y el administrador confirma cuantos se cargaran.
 */
export function StudentImportDialog({ onClose, onImported }: StudentImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>({ name: "choose" });
  const [university, setUniversity] = useState<University | "">("");
  const [paralelo, setParalelo] = useState<Paralelo | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Numera las revisiones pedidas al corregir a mano: solo la ultima actualiza la pantalla. */
  const reviewSeq = useRef(0);

  const canReview = university !== "" && paralelo !== "";

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Con solo cancelar el evento «cancel», Chrome cierra igual el dialogo si se aprieta Escape dos veces sin tocar
  // nada entre medio. Se corta la tecla en el documento (el foco puede estar fuera del dialogo, por ejemplo al
  // ocultarse el boton que se acaba de apretar) antes de que llegue a ese mecanismo.
  useEffect(() => {
    function ignoreEscape(event: KeyboardEvent) {
      if (event.key === "Escape") event.preventDefault();
    }

    document.addEventListener("keydown", ignoreEscape, true);

    return () => document.removeEventListener("keydown", ignoreEscape, true);
  }, []);

  const context: ImportWarningsContext = {
    university: university ? (universityLabel(university) ?? "") : "",
    paralelo: paralelo === "" ? 0 : paralelo,
  };

  function close() {
    if (step.name === "done") onImported();

    onClose();
  }

  async function handleTemplate() {
    saveBlob(await importTemplateBlob(), "formato_estudiantes_neuroflex.xlsx");
  }

  async function handleReview(event: FormEvent) {
    event.preventDefault();

    if (university === "") return setError("Elige la universidad de los estudiantes del archivo.");
    if (paralelo === "") return setError("Elige el paralelo de los estudiantes del archivo.");
    if (!file) return setError("Elige el archivo Excel.");

    setError(null);
    setBusy(true);

    const read = await readImportFile(file);

    if (!read.ok) {
      setBusy(false);
      return setError(read.message);
    }

    const response = await importStudentsAction({
      paralelo,
      university,
      dryRun: true,
      rows: read.rows,
    });

    setBusy(false);

    if (!response.success) return setError(response.message);

    setStep({ name: "review", rows: read.rows, report: response.data, fixed: [] });
  }

  /**
   * El administrador eligio region y comuna para un estudiante cuya region o comuna no se pudo asociar: se
   * reemplazan en esa fila y se vuelve a revisar (nada se guarda) para que los avisos y los totales sean los reales.
   */
  async function handleFixPlace(current: Extract<Step, { name: "review" }>, rowNumber: number, place: { region: string; comuna: string }) {
    if (university === "" || paralelo === "") return;

    // Al elegir la region por primera vez se conserva la comuna del Excel si es de esa region (si no, se perderia).
    const original = current.rows.find((row) => row.row === rowNumber);
    const keepCommune =
      !current.fixed.includes(rowNumber) && place.region !== "" && place.comuna === "" && original !== undefined;
    const chosen = keepCommune ? { ...place, comuna: officialCommune(place.region, original.comuna) } : place;

    const rows = applyPlaceFix(current.rows, rowNumber, chosen);
    const fixed = current.fixed.includes(rowNumber) ? current.fixed : [...current.fixed, rowNumber];
    const seq = ++reviewSeq.current;

    setError(null);
    setStep({ ...current, rows, fixed });
    setBusy(true);

    const response = await importStudentsAction({ paralelo, university, dryRun: true, rows });

    if (seq !== reviewSeq.current) return;

    setBusy(false);

    if (!response.success) return setError(response.message);

    setStep({ name: "review", rows, report: response.data, fixed });
  }

  async function handleConfirm(rows: StudentImportRow[]) {
    if (paralelo === "" || university === "") return;

    setError(null);
    setBusy(true);

    const response = await importStudentsAction({
      paralelo,
      university,
      dryRun: false,
      rows,
    });

    setBusy(false);

    if (!response.success) return setError(response.message);

    setStep({ name: "done", report: response.data });
  }

  return (
    <dialog
      ref={dialogRef}
      // Escape no cierra la carga: a mitad de una revision se perderia todo sin querer. Se cierra con los botones.
      onCancel={(event) => event.preventDefault()}
      aria-labelledby="student-import-title"
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-5 text-white backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-emerald-400" aria-hidden="true" />
          <h2 id="student-import-title" className="text-lg font-semibold">
            Cargar estudiantes desde Excel
          </h2>
        </div>

        {/* Sigue montado (oculto) mientras se revisa: asi, al cancelar la carga, el archivo elegido no se pierde. */}
        {step.name !== "done" && (
          <form onSubmit={handleReview} className={step.name === "choose" ? "flex flex-col gap-4" : "hidden"}>
            <p className="text-sm text-zinc-400">
              El archivo debe ser un Excel (.xlsx) con las columnas NOMBRE, RUT, FECHA_NACIMIENTO, EMAIL, CELULAR, COMUNA,
              REGION, JORNADA y GENERO. El nombre va como «Apellido Paterno, Apellido Materno y Nombres»; los apellidos como
              «De La Fuente» o «Del Río» se reconocen solos. Lo que esté vacío queda sin rellenar.
            </p>

            <button
              type="button"
              onClick={handleTemplate}
              className="min-h-11 w-fit text-left text-sm text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
            >
              Descargar el formato (Excel vacío)
            </button>

            <Field>
              <FieldLabel htmlFor="import-university">Universidad de todos los estudiantes del archivo</FieldLabel>
              <select
                id="import-university"
                className={SELECT_CLASS}
                value={university}
                onChange={(event) => setUniversity(event.target.value as University | "")}
              >
                <option value="" className="bg-zinc-900 text-white">
                  Seleccionar
                </option>
                {UNIVERSITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-zinc-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="import-paralelo">Paralelo de todos los estudiantes del archivo</FieldLabel>
              <select
                id="import-paralelo"
                className={SELECT_CLASS}
                value={paralelo}
                onChange={(event) => setParalelo(event.target.value === "" ? "" : (Number(event.target.value) as Paralelo))}
              >
                <option value="" className="bg-zinc-900 text-white">
                  Seleccionar
                </option>
                {PARALELO_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-zinc-900 text-white">
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="import-file">Archivo Excel</FieldLabel>
              <input
                id="import-file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setError(null);
                }}
                className="min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-black"
              />
            </Field>

            {error && (
              <p role="alert" className="text-sm text-rose-400">
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={busy || !canReview}
                aria-describedby={canReview ? undefined : "import-review-hint"}
                className="bg-white text-black hover:bg-zinc-200"
              >
                {busy ? "Revisando..." : "Revisar datos"}
              </Button>
            </div>

            {!canReview && (
              <p id="import-review-hint" className="text-xs text-zinc-400 sm:text-right">
                Elige la universidad y el paralelo para poder revisar los datos.
              </p>
            )}
          </form>
        )}

        {step.name === "review" && (
          <ReviewStep
            report={step.report}
            rows={step.rows}
            fixed={step.fixed}
            onFixPlace={(rowNumber, place) => handleFixPlace(step, rowNumber, place)}
            context={context}
            scope={`Paralelo ${paralelo} · ${universityLabel(university as University) ?? ""}`}
            busy={busy}
            error={error}
            onBack={() => {
              setError(null);
              setStep({ name: "choose" });
            }}
            onConfirm={() => handleConfirm(step.rows)}
          />
        )}

        {step.name === "done" && <DoneStep report={step.report} context={context} onClose={close} />}
      </div>
    </dialog>
  );
}

function Summary({ items }: { items: { label: string; value: number; tone: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-zinc-800 p-3">
          <dt className="text-xs text-zinc-400">{item.label}</dt>
          <dd className={`text-xl font-semibold ${item.tone}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type PlaceFixProps = {
  rows: StudentImportRow[];
  /** Filas cuya region o comuna ya se corrigio a mano (siguen en la lista para poder cambiarlas otra vez). */
  fixed: number[];
  onFixPlace: (rowNumber: number, place: { region: string; comuna: string }) => void;
};

const FIX_SELECT_CLASS =
  "h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-white disabled:opacity-50";

function Problems({
  report,
  context,
  fix,
}: {
  report: StudentImportReport;
  context: ImportWarningsContext;
  /** Solo en la revision: permite elegir a mano la region y la comuna que no se pudieron asociar. */
  fix?: PlaceFixProps;
}) {
  const problems = report.results.filter((result) => result.status === "exists" || result.status === "error");
  const warned = report.results.filter((result) => result.warnings.length > 0);
  // En la revision tambien siguen a la vista los ya corregidos, para poder cambiarlos otra vez.
  const listed = report.results.filter((result) => result.warnings.length > 0 || fix?.fixed.includes(result.row));

  return (
    <>
      {problems.length > 0 && (
        <section aria-label="Filas que no se cargan" className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-rose-300">Filas que no se cargan</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {problems.map((result) => (
              <li key={result.row} className="rounded-lg bg-zinc-900 p-2">
                <span className="font-medium">Fila {result.row}</span>
                {result.name || result.rut ? <span className="text-zinc-400"> · {result.name ?? result.rut}</span> : null}
                <span className="block text-zinc-300">{result.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {listed.length > 0 && (
        <section aria-label="Datos sin rellenar" className="flex flex-col gap-2">
          <details open={fix !== undefined && warned.length === 0} className="rounded-lg border border-zinc-800 p-3 text-sm">
            <summary className={`min-h-11 cursor-pointer py-2 ${warned.length > 0 ? "text-amber-300" : "text-emerald-300"}`}>
              {warned.length > 0
                ? `${warned.length} ${warned.length === 1 ? "estudiante con datos" : "estudiantes con datos"} que no se pudieron cargar (quedan sin rellenar)`
                : `${listed.length} ${listed.length === 1 ? "estudiante corregido" : "estudiantes corregidos"} a mano`}
            </summary>

            {fix && warned.some(hasPlaceWarning) && (
              <p className="mt-2 text-xs text-zinc-400">
                Si la región o la comuna no se pudo asociar, elígela aquí antes de cargar. Si la dejas en «Seleccionar»,
                queda sin rellenar.
              </p>
            )}

            <ul className="mt-2 flex flex-col gap-1.5">
              {listed.map((result) => (
                <li key={result.row} className="rounded-lg bg-zinc-900 p-2">
                  <span className="font-medium">Fila {result.row}</span>
                  <span className="text-zinc-400"> · {result.name}</span>
                  {result.warnings.map((warning) => (
                    <span key={warning} className="block text-zinc-300">
                      {warning}
                    </span>
                  ))}

                  {fix && (hasPlaceWarning(result) || fix.fixed.includes(result.row)) && (
                    <PlaceFixer result={result} fix={fix} />
                  )}
                </li>
              ))}
            </ul>
          </details>

          {warned.length > 0 && (
            <Button type="button" variant="outline" onClick={() => void downloadImportWarningsExcel(report.results, context)}>
              <Download className="size-4" aria-hidden="true" />
              Descargar Excel de datos sin rellenar
            </Button>
          )}
        </section>
      )}
    </>
  );
}

/** Region y comuna de un estudiante, para elegirlas de las listas oficiales cuando el Excel no las trae bien. */
function PlaceFixer({ result, fix }: { result: StudentImportRowResult; fix: PlaceFixProps }) {
  const source = fix.rows.find((row) => row.row === result.row);
  const place = placeForSelects(source?.region, source?.comuna);
  const wasFixed = fix.fixed.includes(result.row);

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-zinc-800 pt-2">
      {wasFixed && !hasPlaceWarning(result) && (
        <span className="text-xs text-emerald-300">Corregido a mano: se cargará con lo que elegiste.</span>
      )}

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <RegionCommuneFields
          idPrefix={`fix-${result.row}`}
          region={place.region}
          comuna={place.comuna}
          onChange={(next) => fix.onFixPlace(result.row, next)}
          selectClassName={FIX_SELECT_CLASS}
          optionClassName="bg-zinc-900 text-white"
          allowClear
        />
      </div>
    </div>
  );
}

type ReviewStepProps = {
  report: StudentImportReport;
  rows: StudentImportRow[];
  fixed: number[];
  onFixPlace: PlaceFixProps["onFixPlace"];
  context: ImportWarningsContext;
  scope: string;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
};

function ReviewStep({ report, rows, fixed, onFixPlace, context, scope, busy, error, onBack, onConfirm }: ReviewStepProps) {
  const { summary } = report;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">
        Revisé el archivo ({summary.total} {summary.total === 1 ? "fila" : "filas"}). Todavía no se guardó nada. Se cargarán
        con: <span className="text-white">{scope}</span>.
      </p>

      <Summary
        items={[
          { label: "Se cargarán", value: summary.ready, tone: "text-emerald-400" },
          { label: "Ya existen", value: summary.exists, tone: "text-zinc-200" },
          { label: "Con problemas", value: summary.errors, tone: "text-rose-400" },
          { label: "Con datos sin rellenar", value: summary.withWarnings, tone: "text-amber-300" },
        ]}
      />

      <Problems report={report} context={context} fix={{ rows, fixed, onFixPlace }} />

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
          Cancelar carga
        </Button>

        <Button
          type="button"
          onClick={onConfirm}
          disabled={busy || summary.ready === 0}
          className="bg-white text-black hover:bg-zinc-200"
        >
          {busy ? "Cargando..." : `Cargar ${summary.ready} ${summary.ready === 1 ? "estudiante" : "estudiantes"}`}
        </Button>
      </div>
    </div>
  );
}

function DoneStep({
  report,
  context,
  onClose,
}: {
  report: StudentImportReport;
  context: ImportWarningsContext;
  onClose: () => void;
}) {
  const { summary } = report;

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-sm text-emerald-300">
        Se {summary.created === 1 ? "cargó" : "cargaron"} {summary.created} {summary.created === 1 ? "estudiante" : "estudiantes"}.
        {summary.exists + summary.errors > 0 ? ` ${summary.exists + summary.errors} no se cargaron.` : ""}
      </p>

      <Problems report={report} context={context} />

      <Button type="button" onClick={onClose} className="bg-white text-black hover:bg-zinc-200">
        Cerrar
      </Button>
    </div>
  );
}
