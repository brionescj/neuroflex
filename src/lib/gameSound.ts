import { useSyncExternalStore } from "react";

/**
 * Sonidos de los juegos, sintetizados con Web Audio (sin archivos): cortos, suaves y alegres, como los
 * de un juego de casual (tonos de campanilla que suben cuando se acierta). Ninguno es "de error": al
 * chocar una linea o al terminar sin pasar el nivel suena algo amable, nunca un regano.
 *
 * Los navegadores solo dejan sonar despues de un toque de la persona: `unlockSound()` se llama dentro de
 * un toque (Comenzar, un color, un nodo...). Si el navegador no tiene audio o lo bloquea, todo sigue
 * funcionando sin sonido.
 *
 * El silencio se recuerda solo en esta pestana (sessionStorage), como el resto de la memoria de pantalla.
 */
const MUTE_KEY = "neuroflex:sonido-apagado";

let ctx: AudioContext | null = null;
let muted = readMuted();

const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return sessionStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(value: boolean): void {
  muted = value;

  try {
    if (value) sessionStorage.setItem(MUTE_KEY, "1");
    else sessionStorage.removeItem(MUTE_KEY);
  } catch {
    // Sin sessionStorage solo se pierde el recuerdo tras recargar.
  }

  listeners.forEach((listener) => listener());
}

/** Para pintar el boton de silencio. */
export function useSoundMuted(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    isSoundMuted,
    () => false,
  );
}

/** Crea o reactiva el audio. Llamar dentro de un toque de la persona. */
export function unlockSound(): void {
  try {
    if (!ctx) {
      const Context =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!Context) return;

      ctx = new Context();
    }

    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

type ToneOptions = {
  /** Segundos desde ahora. */
  at?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  /** Frecuencia final: el tono se desliza hasta ella. */
  slideTo?: number;
};

/** Una nota con ataque corto y caida suave, mas un armonico leve que le da brillo de campanilla. */
function tone(freq: number, { at = 0, duration = 0.22, type = "sine", gain = 0.16, slideTo }: ToneOptions = {}) {
  if (muted || !ctx || ctx.state !== "running") return;

  try {
    const start = ctx.currentTime + at;
    const end = start + duration;

    const play = (frequency: number, level: number, shape: OscillatorType) => {
      const osc = ctx!.createOscillator();
      const amp = ctx!.createGain();

      osc.type = shape;
      osc.frequency.setValueAtTime(frequency, start);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo * (frequency / freq), end);

      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(level, start + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(amp).connect(ctx!.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    };

    play(freq, gain, type);
    play(freq * 2, gain * 0.28, "sine");
  } catch {
    // Un navegador que no deja sonar no debe romper el juego.
  }
}

// Escala pentatonica de do mayor: cualquier combinacion de notas suena bien.
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

/** El tono de cada color de Seriacion (siempre el mismo, para poder "oir" la secuencia). */
const COLOR_NOTE: Record<string, number> = {
  blue: PENTATONIC[0]!,
  green: PENTATONIC[2]!,
  orange: PENTATONIC[3]!,
  red: PENTATONIC[4]!,
};

export const sounds = {
  /** Un color de Seriacion, al iluminarse o al tocarlo. */
  color(id: string) {
    tone(COLOR_NOTE[id] ?? PENTATONIC[0]!, { duration: 0.32, gain: 0.2, type: "triangle" });
  },

  /** Cuenta regresiva: un "tic" por numero. */
  countdownTick() {
    tone(660, { duration: 0.12, gain: 0.14, type: "triangle" });
  },

  /** Fin de la cuenta regresiva: "¡ya!". */
  countdownGo() {
    tone(PENTATONIC[3]!, { duration: 0.14, gain: 0.16, type: "triangle" });
    tone(PENTATONIC[5]!, { at: 0.09, duration: 0.3, gain: 0.18, type: "triangle" });
  },

  /** Nivel superado: arpegio ascendente. */
  levelUp() {
    [0, 2, 3, 5].forEach((step, i) =>
      tone(PENTATONIC[step]!, { at: i * 0.09, duration: 0.3, gain: 0.17, type: "triangle" }),
    );
  },

  /** Nivel no superado: dos notas suaves que bajan, sin dureza. */
  levelMissed() {
    tone(PENTATONIC[3]!, { duration: 0.22, gain: 0.12 });
    tone(PENTATONIC[1]!, { at: 0.16, duration: 0.34, gain: 0.12 });
  },

  /** Nodos: se toma un nodo y empieza una linea. */
  nodePick() {
    tone(PENTATONIC[2]!, { duration: 0.09, gain: 0.1, type: "triangle" });
  },

  /** Nodos: dos nodos quedan unidos. Cada par unido suena mas agudo que el anterior (como un combo). */
  nodeJoin(pairsConnected: number) {
    const base = PENTATONIC[Math.min(Math.max(pairsConnected - 1, 0), PENTATONIC.length - 2)]!;

    tone(base, { duration: 0.18, gain: 0.18, type: "triangle" });
    tone(base * 1.5, { at: 0.08, duration: 0.3, gain: 0.18, type: "triangle" });
  },

  /** Nodos: la linea choca con otra o con un nodo. Un "bonk" corto y blando. */
  lineBlocked() {
    tone(220, { duration: 0.14, gain: 0.16, type: "sine", slideTo: 150 });
  },

  /** Nodos: se acorta o se deshace un trazo. */
  lineUndone() {
    tone(PENTATONIC[1]!, { duration: 0.1, gain: 0.09, type: "sine", slideTo: PENTATONIC[0]! });
  },
};
