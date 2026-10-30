import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { AdminMiniCase, SaveMiniCasePayload } from "@/types";

import { saveMiniCaseAction } from "../actions/miniCases.action";
import { initialMiniCaseState, miniCaseFormProblem, type MiniCaseFormState } from "../utils/miniCaseForm";
import { MiniCaseImagePicker } from "./MiniCaseImagePicker";

const MAX_TITLE = 120;
const MAX_TEXT = 1500;
const MAX_OPTION = 500;

const STEP_HELP = [
  "Paso 1 — lo primero que se hace",
  "Paso 2",
  "Paso 3",
  "Paso 4 — lo último que se hace",
] as const;

type MiniCaseFormProps = {
  /** Sin caso se crea uno nuevo; con caso se edita ese. */
  initial?: AdminMiniCase;
  /** «Mini Caso 12»: el numero que lleva el caso (el siguiente libre, si es nuevo). */
  label: string;
  onSaved: (saved: AdminMiniCase) => void;
  onCancel: () => void;
};

/**
 * Alta y edicion de un mini caso. Las 4 alternativas se escriben en el orden CORRECTO (la primera es la
 * que va en el paso 1); el juego se las muestra mezcladas al estudiante.
 */
export function MiniCaseForm({ initial, label, onSaved, onCancel }: MiniCaseFormProps) {
  const [state, setState] = useState<MiniCaseFormState>(() => initialMiniCaseState(initial));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editing = initial !== undefined;
  const alternates = initial?.alternateOrders?.length ?? 0;

  function patch(next: Partial<MiniCaseFormState>) {
    setState((current) => ({ ...current, ...next }));
    setError(null);
  }

  function setOption(index: number, text: string) {
    patch({ options: state.options.map((option, i) => (i === index ? { ...option, text } : option)) });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const problem = miniCaseFormProblem(state);

    if (problem) {
      setError(problem);
      return;
    }

    const payload: SaveMiniCasePayload = {
      ...(initial ? { caseKey: initial.caseKey } : {}),
      title: state.title.trim(),
      imageKey: state.imageKey,
      baseText: state.baseText.trim(),
      twistText: state.twistText.trim(),
      promptText: state.promptText.trim(),
      feedback: state.feedback.trim(),
      options: state.options.map((option, index) => ({
        ...(option.optionKey ? { optionKey: option.optionKey } : {}),
        text: option.text.trim(),
        correctStep: (index + 1) as 1 | 2 | 3 | 4,
      })),
    };

    setIsSaving(true);

    const response = await saveMiniCaseAction(payload);

    setIsSaving(false);

    if (!response.success) {
      setError(response.message);
      return;
    }

    onSaved(response.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold">{editing ? "Editar mini caso" : "Agregar mini caso"}</h2>

      {editing && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Edita el texto, la alerta, la consigna o las alternativas solo para corregir gramática o contextualizar
          mejor. Un cambio de fondo hace que las partidas ya jugadas no reflejen fielmente los datos estadísticos.
        </p>
      )}

      <Field>
        <FieldLabel htmlFor="mc-title">Título del mini caso</FieldLabel>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-zinc-300">{label}:</span>
          <Input
            id="mc-title"
            value={state.title}
            maxLength={MAX_TITLE}
            placeholder="Área de Lenguaje y Comunicación"
            onChange={(event) => patch({ title: event.target.value })}
          />
        </div>
        <p className="text-xs text-zinc-500">
          Escribe solo el nombre del área, con la inicial de cada palabra importante en mayúscula. El estudiante ve
          únicamente ese nombre; «{label}:» solo aparece en este panel.
        </p>
      </Field>

      <Field>
        <FieldLabel htmlFor="mc-base">Mini caso (se muestra 10 segundos)</FieldLabel>
        <Textarea
          id="mc-base"
          value={state.baseText}
          maxLength={MAX_TEXT}
          onChange={(event) => patch({ baseText: event.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="mc-twist">Alerta de cambio</FieldLabel>
        <Textarea
          id="mc-twist"
          value={state.twistText}
          maxLength={MAX_TEXT}
          placeholder="Describe el cambio inesperado de contexto..."
          onChange={(event) => patch({ twistText: event.target.value })}
        />
        <p className="text-xs text-zinc-500">
          El juego ya muestra el encabezado «¡Alerta de cambio!»; no hace falta escribirlo (si lo escribes, no se repite).
        </p>
      </Field>

      <Field>
        <FieldLabel htmlFor="mc-prompt">Consigna de la pregunta</FieldLabel>
        <Textarea
          id="mc-prompt"
          value={state.promptText}
          maxLength={MAX_TEXT}
          className="min-h-20"
          onChange={(event) => patch({ promptText: event.target.value })}
        />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-white">Alternativas, en el orden correcto</legend>

        <p className="text-xs text-zinc-500">
          Escríbelas en el orden en que deben hacerse. El juego se las muestra mezcladas al estudiante.
        </p>

        {state.options.map((option, index) => (
          <Field key={index}>
            <FieldLabel htmlFor={`mc-option-${index}`}>{STEP_HELP[index]}</FieldLabel>
            <Textarea
              id={`mc-option-${index}`}
              value={option.text}
              maxLength={MAX_OPTION}
              className="min-h-20"
              onChange={(event) => setOption(index, event.target.value)}
            />
          </Field>
        ))}

        {alternates > 0 && (
          <p className="text-xs text-zinc-500">
            Este caso acepta además {alternates === 1 ? "otro orden" : `${alternates} órdenes más`} como correcto; se
            conserva{alternates === 1 ? "" : "n"} al guardar.
          </p>
        )}
      </fieldset>

      <Field>
        <FieldLabel htmlFor="mc-feedback">Retroalimentación (se muestra al enviar la respuesta)</FieldLabel>
        <Textarea
          id="mc-feedback"
          value={state.feedback}
          maxLength={MAX_TEXT}
          onChange={(event) => patch({ feedback: event.target.value })}
        />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-white">Imagen del distractor</legend>

        <p className="text-xs text-zinc-500">
          Se muestra 4 segundos, entre la lectura y la alerta de cambio, junto con un sonido suave. Elige un lugar
          o un material relacionado con el caso; evita imágenes que cuenten el caso, porque ayudan a recordarlo.
        </p>

        <MiniCaseImagePicker value={state.imageKey} onChange={(imageKey) => patch({ imageKey })} />
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar mini caso"}
        </Button>
      </div>
    </form>
  );
}
