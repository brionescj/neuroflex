type Props = {
  /** Errores del intento en curso (ya ponderados). */
  errors: number;
  /** Errores que se permiten en el nivel. */
  allowed: number;
};

/**
 * Margen de errores del intento. Se muestra lo que QUEDA (no lo que se lleva
 * gastado): mirar un margen que se achica motiva a cuidar la jugada sin
 * castigar. Verde con holgura, ambar al quedar poco y rosa con el ultimo.
 */
export function ErrorMeter({ errors, allowed }: Props) {
  const remaining = Math.max(0, allowed - errors);
  const ratio = allowed > 0 ? remaining / allowed : 0;

  const tone =
    remaining <= 1
      ? { bar: "bg-rose-400", text: "text-rose-300" }
      : ratio <= 0.34
        ? { bar: "bg-amber-400", text: "text-amber-300" }
        : { bar: "bg-emerald-400", text: "text-emerald-300" };

  return (
    <div className="flex w-full flex-col gap-1.5" data-testid="error-meter">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-zinc-400">Margen de errores</span>

        <span className={`font-semibold ${tone.text}`} aria-live="polite">
          Te {remaining === 1 ? "queda" : "quedan"} {remaining} de {allowed}
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-label="Margen de errores restante"
        aria-valuemin={0}
        aria-valuemax={allowed}
        aria-valuenow={remaining}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${tone.bar}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
