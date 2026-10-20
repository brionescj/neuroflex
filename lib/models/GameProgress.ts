import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type GameId = "color-sequence" | "mini-cases" | "node-connection";

export type GameProgressDocument = {
  studentRut: string;
  gameId: GameId;
  // Blob de estado propio de cada juego (fase, indice de nivel/caso,
  // resultados parciales, etc.). Se deja como Mixed a proposito: cada
  // juego tiene una forma de estado distinta, y forzar un schema comun
  // aqui obligaria a migrar este modelo cada vez que se agregue un juego
  // nuevo. La forma esperada por juego se documenta en TypeScript del
  // lado del cliente (GameProgressState en cada hook), no aqui.
  state: unknown;
};

const gameProgressSchema = new Schema<GameProgressDocument>(
  {
    studentRut: { type: String, required: true },
    gameId: {
      type: String,
      enum: ["color-sequence", "mini-cases", "node-connection"],
      required: true,
    },
    state: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

// Un solo progreso guardado por estudiante y por juego: guardar de nuevo
// reemplaza el anterior, no acumula historial.
gameProgressSchema.index({ studentRut: 1, gameId: 1 }, { unique: true });

export const GameProgress =
  models.GameProgress ||
  model<GameProgressDocument>("GameProgress", gameProgressSchema);
