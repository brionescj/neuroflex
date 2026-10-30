import { Field, FieldLabel } from "@/components/ui/Field";

import { EMPTY_ALTERNATE_ORDER } from "../utils/miniCaseForm";

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-white";

const POSITIONS = ["Primero", "Segundo", "Tercero", "Cuarto"] as const;

/** El comienzo del texto de una alternativa, para reconocerla en la lista sin que la lista se desborde. */
function preview(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");

  if (clean.length === 0) return "(sin escribir)";

  return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean;
}

type AlternateOrdersFieldsProps = {
  /** Los textos de las 4 alternativas, en el orden correcto principal. */
  optionTexts: string[];
  accepts: boolean;
  orders: (number | null)[][];
  onChange: (next: { accepts: boolean; orders: (number | null)[][] }) => void;
};

/**
 * «Este caso acepta otro orden correcto»: la casilla abre UN segundo orden correcto (no hay boton para agregar mas).
 * Se arma eligiendo, para cada posicion, cual alternativa va ahi; la alternativa N es la que se escribio en el paso N
 * del orden principal, y una alternativa elegida en una posicion ya no se ofrece en las demas. El estudiante que
 * responda cualquiera de los dos ordenes queda como acierto.
 */
export function AlternateOrdersFields({ optionTexts, accepts, orders, onChange }: AlternateOrdersFieldsProps) {
  function toggle(checked: boolean) {
    onChange({ accepts: checked, orders: checked && orders.length === 0 ? [[...EMPTY_ALTERNATE_ORDER]] : orders });
  }

  function setStep(orderIndex: number, position: number, value: string) {
    onChange({
      accepts,
      orders: orders.map((order, i) =>
        i === orderIndex ? order.map((step, p) => (p === position ? (value === "" ? null : Number(value)) : step)) : order,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 p-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-white">
        <input
          type="checkbox"
          checked={accepts}
          onChange={(event) => toggle(event.target.checked)}
          className="size-5 shrink-0 accent-emerald-400"
        />
        Este caso acepta otro orden correcto
      </label>

      {!accepts && (
        <p className="text-xs text-zinc-500">
          Márcala si el caso tiene más de una secuencia válida. Quien responda cualquiera de ellas queda como acierto.
        </p>
      )}

      {accepts && (
        <>
          <p className="text-xs text-zinc-500">
            Para cada posición, elige qué alternativa va ahí. «Alternativa 1» es la que escribiste en el paso 1 arriba,
            «Alternativa 2» la del paso 2, y así. Cada alternativa se puede usar una sola vez. Desmarcar la casilla elimina
            este orden al guardar.
          </p>

          {orders.slice(0, 1).map((order, orderIndex) => (
            <fieldset key={orderIndex} className="flex flex-col gap-3 rounded-lg bg-zinc-900/60 p-3">
              <legend className="px-1 text-sm font-medium text-zinc-200">Otro orden correcto</legend>

              {POSITIONS.map((position, index) => {
                // Una alternativa ya elegida en otra posicion no se ofrece de nuevo: cada una va una sola vez.
                const takenElsewhere = new Set(order.filter((step, other) => other !== index && step !== null));

                return (
                  <Field key={position}>
                    <FieldLabel htmlFor={`mc-alt-${orderIndex}-${index}`}>{position}</FieldLabel>
                    <select
                      id={`mc-alt-${orderIndex}-${index}`}
                      className={SELECT_CLASS}
                      value={order[index] ?? ""}
                      onChange={(event) => setStep(orderIndex, index, event.target.value)}
                    >
                      <option value="" className="bg-zinc-900 text-white">
                        Seleccionar
                      </option>
                      {optionTexts.map((text, step) =>
                        takenElsewhere.has(step + 1) ? null : (
                          <option key={step} value={step + 1} className="bg-zinc-900 text-white">
                            {`Alternativa ${step + 1}: ${preview(text)}`}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>
                );
              })}
            </fieldset>
          ))}
        </>
      )}
    </div>
  );
}
