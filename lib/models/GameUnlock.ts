import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

/**
 * Juego que el estudiante desbloqueo. Se crea UNA vez, la primera vez que
 * cumple la regla, y no se borra ni se recalcula: un logro obtenido no se
 * pierde porque despues juegue peor o abandone una partida antes de tiempo.
 */
export type GameUnlockDocument = {
  studentRut: string;
  gameId: "mini-cases";
  unlockedAt: Date;
  /** "rule" lo creo el sistema al cumplirse la regla; otro valor, una persona. */
  source: string;
  /** Version de la regla con la que se desbloqueo. */
  rule: string;
  /** Lo que se midio en ese momento (para poder auditar el desbloqueo). */
  evidence: Record<string, number>;
};

const gameUnlockSchema = new Schema<GameUnlockDocument>(
  {
    studentRut: { type: String, required: true },
    gameId: { type: String, enum: ["mini-cases"], required: true },
    unlockedAt: { type: Date, required: true },
    source: { type: String, required: true, default: "rule" },
    rule: { type: String, required: true },
    evidence: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Un estudiante desbloquea cada juego una sola vez.
gameUnlockSchema.index({ studentRut: 1, gameId: 1 }, { unique: true });

export const GameUnlock =
  models.GameUnlock || model<GameUnlockDocument>("GameUnlock", gameUnlockSchema);
