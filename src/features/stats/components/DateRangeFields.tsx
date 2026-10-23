import { MAX_RANGE_DATE, MIN_RANGE_DATE, rangeProblem } from "../utils/selection";
import type { DateRangeInput } from "../types";

const INPUT =
  "h-11 w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-zinc-500 scheme-dark";

type DateRangeFieldsProps = {
  /** Identifica los campos (para sus etiquetas): uno distinto por rango. */
  idPrefix: string;
  value: DateRangeInput;
  onChange: (next: DateRangeInput) => void;
  /** Que rango es, para quien usa lector de pantalla («Rango 2»). */
  label?: string;
};

/** Dos fechas, «desde» y «hasta», con el error a la vista cuando no calzan. */
export function DateRangeFields({ idPrefix, value, onChange, label }: DateRangeFieldsProps) {
  // El mensaje solo aparece cuando ya se escribio algo: un campo vacio recien abierto no es un error.
  const touched = value.from !== "" || value.to !== "";
  const problem = touched ? rangeProblem(value) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-zinc-400" htmlFor={`${idPrefix}-from`}>
          Desde
          <input
            id={`${idPrefix}-from`}
            type="date"
            aria-label={label ? `${label}: desde` : undefined}
            min={MIN_RANGE_DATE}
            max={MAX_RANGE_DATE}
            value={value.from}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
            className={INPUT}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-zinc-400" htmlFor={`${idPrefix}-to`}>
          Hasta
          <input
            id={`${idPrefix}-to`}
            type="date"
            aria-label={label ? `${label}: hasta` : undefined}
            min={value.from || MIN_RANGE_DATE}
            max={MAX_RANGE_DATE}
            value={value.to}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
            className={INPUT}
          />
        </label>
      </div>

      {problem && (
        <p role="alert" className="text-xs text-red-300">
          {problem}
        </p>
      )}
    </div>
  );
}
