import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type GameLeaseDocument = {
  studentRut: string;
  gameId: "color-sequence" | "mini-cases" | "node-connection";
  /** La pestana o dispositivo que abrio el juego en ultimo lugar. */
  leaseId: string;
};

const gameLeaseSchema = new Schema<GameLeaseDocument>(
  {
    studentRut: { type: String, required: true },
    gameId: {
      type: String,
      enum: ["color-sequence", "mini-cases", "node-connection"],
      required: true,
    },
    leaseId: { type: String, required: true },
  },
  { timestamps: true },
);

// Un solo "quien tiene el juego abierto" por estudiante y por juego.
gameLeaseSchema.index({ studentRut: 1, gameId: 1 }, { unique: true });

export const GameLease =
  models.GameLease || model<GameLeaseDocument>("GameLease", gameLeaseSchema);
