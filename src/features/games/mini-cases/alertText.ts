/**
 * El encabezado de la alerta ya dice «¡Alerta de cambio!»; los textos del banco la repiten al comienzo
 * («¡Alerta de Cambio! El estudiante...»), asi que se quita esa repeticion al mostrarlos.
 */
export function withoutAlertPrefix(text: string): string {
  return text.replace(/^\s*¡\s*alerta de cambio\s*!\s*/i, "");
}
