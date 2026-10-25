/**
 * Indicador de carga a pantalla completa: mientras se confirma la sesion o se
 * descarga la pantalla pedida. Mejor que dejar la pantalla en blanco.
 */
export function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-dvh place-items-center bg-zinc-950 text-zinc-400"
    >
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-zinc-700 border-t-white"
        />
        <span className="text-sm">Cargando...</span>
      </div>
    </div>
  );
}

/** Lo mismo pero dentro de una pantalla (bajo el menu), sin ocupar toda la ventana. */
export function SectionLoader() {
  return (
    <div role="status" aria-live="polite" className="flex justify-center py-16 text-zinc-400">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-5 animate-spin rounded-full border-2 border-zinc-700 border-t-white"
        />
        <span className="text-sm">Cargando...</span>
      </div>
    </div>
  );
}
