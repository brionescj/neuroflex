/**
 * Los desbloqueos de juegos que el servidor ya confirmo, por estudiante (clave: su RUT), y SOLO
 * los concedidos. Sirven para pintar el menu y abrir un juego sin esperar otra consulta mientras
 * se vuelve a preguntar al servidor.
 *
 * - Solo se recuerda un "si": en Mini casos el desbloqueo es definitivo (una vez registrado no se
 *   quita). Un "no" nunca se da por bueno sin consultar: podria haberse desbloqueado hace un momento.
 * - Va por RUT y se vacia al iniciar o cerrar sesion, asi lo de un estudiante nunca se le muestra a otro.
 * - Vive en memoria: al recargar la pagina se pierde (el servidor lo vuelve a entregar al abrir la sesion).
 */
export type GrantedGames = { miniCases?: boolean };

const granted = new Map<string, GrantedGames>();

export function rememberGranted(rut: string, access: GrantedGames): void {
  const only: GrantedGames = {};

  if (access.miniCases) only.miniCases = true;

  granted.set(rut, only);
}

export function grantedFor(rut: string | null): GrantedGames | null {
  return rut ? (granted.get(rut) ?? null) : null;
}

export function forgetGranted(): void {
  granted.clear();
}
