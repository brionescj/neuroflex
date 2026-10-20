import type { AttemptHandle } from "../attempts/types";
import type { SoundArchetype } from "./audio/distractorSounds";

/**
 * Forma que entrega /api/mini-cases. A propósito NO incluye correctStep:
 * la clave de respuesta vive solo en el servidor (lib/models/MiniCase.ts)
 * y nunca se manda al cliente, para que la actividad siga midiendo algo
 * una vez que deja de ser un array estático en el bundle.
 */
export type ApiMiniCaseOption = {
  optionKey: string;

  text: string;
};

export type ApiMiniCase = {
  /**
   * Identificador interno del caso. El estudiante NUNCA lo ve: en pantalla
   * se numera por posicion en la partida (1..N). Sirve solo para asociar
   * cada resultado con su caso real.
   */
  caseKey: string;

  /** Fase 1: texto del caso base, visible 10 segundos. */
  baseText: string;

  /** Fase 4: texto del "Giro Inesperado de Contexto". */
  twistText: string;

  /** Fase 5: consigna de la pregunta de ordenamiento. */
  promptText: string;

  /** Ya vienen mezcladas por el servidor; el orden aquí no es el correcto. */
  options: ApiMiniCaseOption[];

  feedback: string;
};

/** Lo que responde POST /api/mini-cases/:caseKey/submit. */
export type MiniCaseSubmitResult = {
  caseKey: string;

  correctSteps: number;

  isFullyCorrect: boolean;
};

/** Resultado local por caso, para el resumen final de la partida. */
export type MiniCaseResult = MiniCaseSubmitResult & {
  /** Tiempo con la pestana visible, desde que aparece el ordenamiento. */
  decisionTimeMs: number;
  /** Orden final elegido: el servidor lo vuelve a puntuar al archivarlo. */
  orderedOptionKeys?: string[];
  /** Igual que decisionTimeMs pero sin la inactividad de mas de 80 s. */
  activeMsNet?: number;
  completedAt?: string;
};

export type MiniCasesSavedPhase = "reading" | "result" | "finished";

/**
 * Avance guardado en /api/game-progress/mini-cases. Se guarda solo en
 * "puntos de control" (inicio de cada caso, resultado de cada caso, fin),
 * porque las fases intermedias son de tiempo fijo y no tiene sentido
 * reanudarlas a la mitad: reanudar siempre vuelve al inicio del caso en
 * curso, en la misma posicion de la partida.
 */
export type MiniCasesProgress = {
  version: 1;

  /** caseKeys en el orden de ESTA partida (define "el 3er ejercicio"). */
  caseOrder: string[];

  /** optionKeys de cada caso, en el orden en que se le mostraron. */
  optionOrder: Record<string, string[]>;

  caseIndex: number;

  phase: MiniCasesSavedPhase;

  results: MiniCaseResult[];

  /** Partida a la que pertenece (ausente en avances anteriores al registro). */
  attempt?: AttemptHandle;
};

export type PixelMotif = {
  name: string;

  /** Mapa de caracter -> color hex. */
  palette: Record<string, string>;

  /** Cada string es una fila; cada caracter referencia una clave de palette. */
  grid: string[];

  /** Sonido procedural acorde al motivo (no ruido genérico). */
  sound: SoundArchetype;
};
