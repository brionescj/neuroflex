import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type GameAttemptStatus = "in_progress" | "finished" | "failed";

/**
 * Una partida de un estudiante en un juego. Se crea con el primer resultado
 * que llega y se cierra al terminar. A diferencia de GameProgress (que solo
 * guarda el ultimo avance para poder reanudar y se borra al terminar), los
 * intentos se conservan para el analisis.
 *
 * "Abandonado" no se guarda: es un intento `in_progress` cuya ultima
 * actividad es antigua, y ese umbral se decide al analizar.
 */
export type GameAttemptDocument = {
  attemptId: string;
  studentRut: string;
  gameId: "color-sequence" | "mini-cases" | "node-connection";
  /** 1 para la primera partida del estudiante en ese juego, 2 la siguiente... */
  attemptNumber: number;
  status: GameAttemptStatus;
  startedAt: Date;
  lastActivityAt: Date;
  finishedAt?: Date;
  /** Version de los tableros / casos / reglas: sin ella no son comparables. */
  contentVersion: string;
  student: {
    paralelo: number | null;
    entryYear: number | null;
    ageAtStart: number | null;
    studyShift: string | null;
    ciudad: string | null;
    region: string | null;
    gender: string | null;
    university: string | null;
  };
  /** Una entrada por carga de la pagina: sirve para detectar cambios de equipo. */
  sessions: {
    sessionId: string;
    firstSeenAt: Date;
    device: {
      pointer: string;
      viewportWidth: number;
      viewportHeight: number;
      pixelRatio: number;
      platform: string;
      browser: string;
      timeZone: string;
      language: string;
    };
  }[];
  summary: Record<string, number>;
};

const deviceSchema = new Schema(
  {
    pointer: { type: String, enum: ["touch", "mouse", "mixed"], required: true },
    viewportWidth: Number,
    viewportHeight: Number,
    pixelRatio: Number,
    platform: String,
    browser: String,
    timeZone: String,
    language: String,
  },
  { _id: false },
);

const sessionSchema = new Schema(
  {
    sessionId: { type: String, required: true },
    firstSeenAt: { type: Date, required: true },
    device: { type: deviceSchema, required: true },
  },
  { _id: false },
);

const gameAttemptSchema = new Schema<GameAttemptDocument>(
  {
    attemptId: { type: String, required: true, unique: true },
    studentRut: { type: String, required: true },
    gameId: {
      type: String,
      enum: ["color-sequence", "mini-cases", "node-connection"],
      required: true,
    },
    attemptNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ["in_progress", "finished", "failed"],
      required: true,
      default: "in_progress",
    },
    startedAt: { type: Date, required: true },
    lastActivityAt: { type: Date, required: true },
    finishedAt: Date,
    contentVersion: { type: String, required: true },
    student: { type: Schema.Types.Mixed, required: true },
    sessions: { type: [sessionSchema], default: [] },
    summary: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// El numero de intento no se repite para un mismo estudiante y juego.
gameAttemptSchema.index(
  { studentRut: 1, gameId: 1, attemptNumber: 1 },
  { unique: true },
);
gameAttemptSchema.index({ gameId: 1, startedAt: 1 });

export const GameAttempt =
  models.GameAttempt ||
  model<GameAttemptDocument>("GameAttempt", gameAttemptSchema);
