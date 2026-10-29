/**
 * Sonidos del distractor de los mini casos. Son solo tres, suaves y sin sobresaltos (nada de ladridos,
 * golpes ni alarmas), y suenan exactamente lo que dura la imagen: 4 segundos, con entrada y salida
 * graduales. Se sintetizan con Web Audio (ruido filtrado y tonos), sin archivos.
 *
 * Cada vez que aparece el distractor se elige uno al azar. Su nombre queda registrado en la partida
 * (`distractorSound`) para el analisis.
 */
export const DISTRACTOR_SOUNDS = ["lluvia", "olas", "campanillas"] as const;

export type DistractorSoundName = (typeof DISTRACTOR_SOUNDS)[number];

export function pickDistractorSound(random: () => number = Math.random): DistractorSoundName {
  const index = Math.min(DISTRACTOR_SOUNDS.length - 1, Math.floor(random() * DISTRACTOR_SOUNDS.length));

  return DISTRACTOR_SOUNDS[index] as DistractorSoundName;
}

/** Cuanto tardan en subir y en bajar el volumen: sin esto el sonido empezaria o terminaria con un corte. */
const FADE_IN = 0.5;
const FADE_OUT = 0.8;

type NoiseKind = "white" | "brown";

function noiseBuffer(ctx: AudioContext, seconds: number, kind: NoiseKind): AudioBuffer {
  const size = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (kind === "white") {
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;

    return buffer;
  }

  // Ruido "marron": grave y envolvente, como el oleaje lejano.
  let last = 0;

  for (let i = 0; i < size; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }

  return buffer;
}

/** Un volumen general que sube y baja suave, para que el sonido no empiece ni termine de golpe. */
function envelope(ctx: AudioContext, destination: AudioNode, seconds: number): GainNode {
  const start = ctx.currentTime;
  const gain = ctx.createGain();

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(1, start + FADE_IN);
  gain.gain.setValueAtTime(1, start + seconds - FADE_OUT);
  gain.gain.linearRampToValueAtTime(0.0001, start + seconds);
  gain.connect(destination);

  return gain;
}

function noiseSource(
  ctx: AudioContext,
  destination: AudioNode,
  seconds: number,
  kind: NoiseKind,
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();

  source.buffer = noiseBuffer(ctx, seconds + 0.1, kind);
  source.connect(destination);
  source.start(ctx.currentTime);
  source.stop(ctx.currentTime + seconds + 0.05);

  return source;
}

/** Una nota con ataque corto y caida larga, como una campanilla de viento. */
function bell(ctx: AudioContext, destination: AudioNode, at: number, freq: number, level: number, decay: number) {
  const start = ctx.currentTime + at;
  const end = start + decay;

  // Un parcial inarmonico (2,76 veces) le da el timbre metalico suave de la campanilla.
  for (const [ratio, part] of [
    [1, 1],
    [2.76, 0.22],
  ] as const) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * ratio, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(level * part, start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(amp).connect(destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

// Escala pentatonica aguda: cualquier combinacion suena armonica.
const CHIME_NOTES = [1046.5, 1174.66, 1318.51, 1567.98, 1760];

/**
 * Programa el sonido elegido. Todo lo que arranca termina antes de `seconds` (mas un margen de
 * centesimas); para cortarlo antes basta con desconectar `destination`.
 */
export function playDistractorSound(
  ctx: AudioContext,
  destination: AudioNode,
  name: DistractorSoundName,
  seconds: number,
): void {
  const master = envelope(ctx, destination, seconds);
  const start = ctx.currentTime;

  switch (name) {
    case "lluvia": {
      const level = ctx.createGain();
      const high = ctx.createBiquadFilter();
      const low = ctx.createBiquadFilter();

      level.gain.value = 0.08;
      high.type = "highpass";
      high.frequency.value = 1400;
      low.type = "lowpass";
      low.frequency.value = 7000;
      level.connect(master);
      high.connect(low).connect(level);
      noiseSource(ctx, high, seconds, "white");

      // Alguna gota mas clara sobre el rumor de fondo.
      for (let i = 0; i < 12; i++) {
        const at = 0.3 + Math.random() * (seconds - 1.2);
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        const freq = 1800 + Math.random() * 1600;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start + at);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, start + at + 0.07);
        amp.gain.setValueAtTime(0.0001, start + at);
        amp.gain.exponentialRampToValueAtTime(0.025, start + at + 0.006);
        amp.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.08);
        osc.connect(amp).connect(master);
        osc.start(start + at);
        osc.stop(start + at + 0.1);
      }

      break;
    }

    case "olas": {
      const swell = ctx.createGain();
      const low = ctx.createBiquadFilter();

      low.type = "lowpass";
      low.Q.value = 0.4;
      swell.gain.setValueAtTime(0.02, start);

      // Dos olas: el volumen y el brillo suben y bajan despacio, de 2 s cada una.
      const half = seconds / 4;

      for (let i = 0; i < 4; i++) {
        const rising = i % 2 === 0;
        const at = start + (i + 1) * half;

        swell.gain.linearRampToValueAtTime(rising ? 0.18 : 0.04, at);
        low.frequency.linearRampToValueAtTime(rising ? 1100 : 450, at);
      }

      low.frequency.setValueAtTime(450, start);
      noiseSource(ctx, low, seconds, "brown");
      low.connect(swell).connect(master);

      break;
    }

    case "campanillas": {
      // 8 notas repartidas en los primeros ~2,6 s; la ultima alcanza a apagarse antes de los 4 s.
      const notes = 8;
      const span = Math.max(0.5, seconds - 1.4 - 0.15);

      for (let i = 0; i < notes; i++) {
        const note = CHIME_NOTES[Math.floor(Math.random() * CHIME_NOTES.length)] ?? 1318.51;
        const at = 0.15 + (i / notes) * span + Math.random() * 0.1;

        bell(ctx, master, at, note, 0.08, 1.25);
      }

      break;
    }
  }
}
