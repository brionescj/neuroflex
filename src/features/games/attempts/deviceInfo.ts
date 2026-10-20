import type { DeviceInfo, DevicePointer } from "./types";

export function classifyPointer(input: {
  primaryCoarse: boolean;
  anyCoarse: boolean;
}): DevicePointer {
  if (input.primaryCoarse) return "touch";
  if (input.anyCoarse) return "mixed";

  return "mouse";
}

/**
 * Familia de sistema operativo y de navegador a partir del user agent. Es
 * una clasificacion gruesa a proposito: basta para agrupar el analisis y no
 * guarda la cadena completa del navegador.
 */
export function classifyUserAgent(
  userAgent: string,
  maxTouchPoints: number,
): { platform: string; browser: string } {
  let platform = "otro";

  if (/Android/i.test(userAgent)) platform = "Android";
  else if (/iPhone|iPad|iPod/i.test(userAgent)) platform = "iOS";
  // Los iPad recientes se presentan como Mac, pero tienen pantalla tactil.
  else if (/Macintosh/i.test(userAgent)) {
    platform = maxTouchPoints > 1 ? "iOS" : "macOS";
  } else if (/CrOS/i.test(userAgent)) platform = "ChromeOS";
  else if (/Windows/i.test(userAgent)) platform = "Windows";
  else if (/Linux/i.test(userAgent)) platform = "Linux";

  let browser = "otro";

  if (/Edg(e|A|iOS)?\//.test(userAgent)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(userAgent)) browser = "Opera";
  else if (/SamsungBrowser/i.test(userAgent)) browser = "Samsung";
  else if (/Firefox|FxiOS/i.test(userAgent)) browser = "Firefox";
  else if (/Chrome|CriOS/i.test(userAgent)) browser = "Chrome";
  else if (/Safari/i.test(userAgent)) browser = "Safari";

  return { platform, browser };
}

function matches(query: string): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches
  );
}

/** Datos del equipo con el que se juega. Nada que identifique a la persona. */
export function collectDeviceInfo(): DeviceInfo {
  const { platform, browser } = classifyUserAgent(
    navigator.userAgent,
    navigator.maxTouchPoints ?? 0,
  );

  let timeZone = "desconocida";

  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || timeZone;
  } catch {
    // Sin soporte de Intl: queda "desconocida".
  }

  return {
    pointer: classifyPointer({
      primaryCoarse: matches("(pointer: coarse)"),
      anyCoarse: matches("(any-pointer: coarse)"),
    }),
    viewportWidth: Math.round(window.innerWidth),
    viewportHeight: Math.round(window.innerHeight),
    pixelRatio: window.devicePixelRatio || 1,
    platform,
    browser,
    timeZone,
    language: navigator.language || "desconocido",
  };
}
