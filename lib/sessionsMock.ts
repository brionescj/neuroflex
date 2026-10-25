/** Sustituto de ./sessions para las pruebas de endpoints: la sesion siempre es la vigente y no toca la base. */
export const sessionsMock = {
  SESSION_REPLACED_CODE: "session-replaced",
  SESSION_REPLACED_MESSAGE: "Tu sesión se cerró porque iniciaste sesión en otro dispositivo o navegador.",
  startStudentSession: async () => "sesion-de-prueba",
  isCurrentSession: async () => true,
  ensureCurrentSession: async () => true,
  forgetKnownSessions: () => undefined,
};
