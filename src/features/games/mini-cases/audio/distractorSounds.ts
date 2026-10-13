export type SoundArchetype =
  | "meow"
  | "bark"
  | "chirp"
  | "splash"
  | "rain"
  | "wind"
  | "chime"
  | "twinkle"
  | "knock";

function noiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
  const size = Math.max(1, Math.floor(ctx.sampleRate * durationSeconds));
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < size; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

type ToneOptions = {
  startTime: number;
  duration: number;
  freqStart: number;
  freqEnd?: number;
  peakGain?: number;
  type?: OscillatorType;
};

function playTone(ctx: AudioContext, destination: AudioNode, opts: ToneOptions) {
  const {
    startTime,
    duration,
    freqStart,
    freqEnd = freqStart,
    peakGain = 0.15,
    type = "sine",
  } = opts;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, startTime);
  osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(
    peakGain,
    startTime + Math.min(0.05, duration / 3),
  );
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.connect(gain).connect(destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

type NoiseBurstOptions = {
  startTime: number;
  duration: number;
  peakGain?: number;
  filterType?: BiquadFilterType;
  filterFreqStart?: number;
  filterFreqEnd?: number;
};

function playNoiseBurst(
  ctx: AudioContext,
  destination: AudioNode,
  opts: NoiseBurstOptions,
) {
  const {
    startTime,
    duration,
    peakGain = 0.15,
    filterType = "lowpass",
    filterFreqStart = 1200,
    filterFreqEnd = filterFreqStart,
  } = opts;

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, duration);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreqStart, startTime);
  filter.frequency.linearRampToValueAtTime(filterFreqEnd, startTime + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(
    peakGain,
    startTime + Math.min(0.03, duration / 4),
  );
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  source.connect(filter).connect(gain).connect(destination);
  source.start(startTime);
  source.stop(startTime + duration + 0.02);
}

/**
 * Genera un sonido acorde al motivo visual mostrado, en vez de ruido
 * generico. Son sintesis procedural (osciladores + ruido filtrado), no
 * clips de audio: no hay pipeline de assets de sonido en el proyecto, y
 * esto evita depender de archivos externos.
 */
export function playDistractorSound(
  ctx: AudioContext,
  destination: AudioNode,
  archetype: SoundArchetype,
  totalDurationSeconds: number,
) {
  const now = ctx.currentTime;

  switch (archetype) {
    case "meow": {
      playTone(ctx, destination, {
        startTime: now + 0.1,
        duration: 0.5,
        freqStart: 500,
        freqEnd: 750,
        type: "triangle",
        peakGain: 0.14,
      });
      playTone(ctx, destination, {
        startTime: now + 0.65,
        duration: 0.35,
        freqStart: 700,
        freqEnd: 350,
        type: "triangle",
        peakGain: 0.12,
      });
      break;
    }

    case "bark": {
      [0.1, 0.4].forEach((t) => {
        playNoiseBurst(ctx, destination, {
          startTime: now + t,
          duration: 0.15,
          filterType: "bandpass",
          filterFreqStart: 500,
          peakGain: 0.18,
        });
      });
      break;
    }

    case "chirp": {
      [0.1, 0.4, 0.8, 1.3].forEach((t, i) => {
        playTone(ctx, destination, {
          startTime: now + t,
          duration: 0.08,
          freqStart: 2200 + i * 200,
          freqEnd: 2800 + i * 150,
          peakGain: 0.1,
        });
      });
      break;
    }

    case "splash": {
      playNoiseBurst(ctx, destination, {
        startTime: now + 0.1,
        duration: 0.4,
        filterType: "lowpass",
        filterFreqStart: 3000,
        filterFreqEnd: 300,
        peakGain: 0.16,
      });
      playTone(ctx, destination, {
        startTime: now + 0.45,
        duration: 0.15,
        freqStart: 900,
        freqEnd: 500,
        peakGain: 0.08,
      });
      break;
    }

    case "rain": {
      const dropCount = 18;
      for (let i = 0; i < dropCount; i++) {
        const t = Math.random() * (totalDurationSeconds - 0.1);
        playNoiseBurst(ctx, destination, {
          startTime: now + t,
          duration: 0.04,
          filterType: "highpass",
          filterFreqStart: 2000,
          peakGain: 0.06,
        });
      }
      break;
    }

    case "wind": {
      playNoiseBurst(ctx, destination, {
        startTime: now,
        duration: totalDurationSeconds,
        filterType: "lowpass",
        filterFreqStart: 500,
        filterFreqEnd: 800,
        peakGain: 0.09,
      });
      break;
    }

    case "chime": {
      playTone(ctx, destination, {
        startTime: now + 0.05,
        duration: 1.4,
        freqStart: 523.25,
        peakGain: 0.12,
      });
      playTone(ctx, destination, {
        startTime: now + 0.15,
        duration: 1.2,
        freqStart: 659.25,
        peakGain: 0.09,
      });
      break;
    }

    case "twinkle": {
      const notes = [784, 880, 988, 1046, 1175];
      let t = 0.1;
      for (let i = 0; i < 6; i++) {
        const freq = notes[Math.floor(Math.random() * notes.length)] ?? 880;
        playTone(ctx, destination, {
          startTime: now + t,
          duration: 0.12,
          freqStart: freq,
          peakGain: 0.09,
        });
        t += 0.25 + Math.random() * 0.2;
      }
      break;
    }

    case "knock": {
      [0.1, 0.45, 0.8].forEach((t) => {
        playNoiseBurst(ctx, destination, {
          startTime: now + t,
          duration: 0.06,
          filterType: "lowpass",
          filterFreqStart: 250,
          peakGain: 0.2,
        });
      });
      break;
    }
  }
}
