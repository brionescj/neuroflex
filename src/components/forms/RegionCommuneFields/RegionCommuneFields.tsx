import { REGION_OPTIONS } from "@/config/studentOptions";
import { communesOf } from "@/config/communes";
import { Field, FieldLabel } from "@/components/ui/Field";
import { officialCommune } from "@/utils/commune";

type RegionCommuneFieldsProps = {
  /** Prefijo de los id de los dos selectores (y de sus etiquetas). */
  idPrefix: string;
  /** Region con su nombre oficial, o "" si no hay. */
  region: string;
  /** Comuna con su nombre oficial, o "" si no hay. */
  comuna: string;
  onChange: (next: { region: string; comuna: string }) => void;
  /** Clases del <select>, para que combine con el formulario donde va. */
  selectClassName: string;
  /** Clases de cada <option> (los formularios oscuros las necesitan para que la lista se lea). */
  optionClassName?: string;
  /** Si es true, se puede volver a «Seleccionar» para borrar el dato (el administrador); el estudiante no. */
  allowClear?: boolean;
  /** Clases del contenedor de cada campo. */
  fieldClassName?: string;
};

/**
 * Region y comuna, siempre como listas: la comuna se elige entre las de la region (la lista oficial de 346
 * comunas), asi que nunca queda escrita a mano ni mal escrita. No hay valor por defecto: sin dato dice
 * «Seleccionar». Al cambiar de region la comuna se conserva solo si tambien es de la nueva.
 */
export function RegionCommuneFields({
  idPrefix,
  region,
  comuna,
  onChange,
  selectClassName,
  optionClassName,
  allowClear = false,
  fieldClassName,
}: RegionCommuneFieldsProps) {
  const communes = communesOf(region);

  return (
    <>
      <Field className={fieldClassName}>
        <FieldLabel htmlFor={`${idPrefix}-region`}>Región</FieldLabel>
        <select
          id={`${idPrefix}-region`}
          className={selectClassName}
          value={region}
          onChange={(event) => {
            const next = event.target.value;

            onChange({ region: next, comuna: next ? officialCommune(next, comuna) : "" });
          }}
        >
          <option value="" disabled={!allowClear && region !== ""} className={optionClassName}>
            Seleccionar
          </option>
          {REGION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className={optionClassName}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field className={fieldClassName}>
        <FieldLabel htmlFor={`${idPrefix}-comuna`}>Comuna</FieldLabel>
        <select
          id={`${idPrefix}-comuna`}
          className={selectClassName}
          value={comuna}
          disabled={region === ""}
          onChange={(event) => onChange({ region, comuna: event.target.value })}
        >
          <option value="" disabled={!allowClear && comuna !== ""} className={optionClassName}>
            {region === "" ? "Primero elige la región" : "Seleccionar"}
          </option>
          {communes.map((commune) => (
            <option key={commune} value={commune} className={optionClassName}>
              {commune}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}
