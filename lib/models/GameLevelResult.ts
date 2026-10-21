import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

/**
 * Resultado de un nivel (seriacion y nodos) o de un caso (mini casos): la
 * unidad de analisis. Se guarda apenas se completa, de modo que si el
 * estudiante se va a mitad de la partida lo ya hecho no se pierde.
 *
 * Lleva copiados los datos del estudiante del intento para poder agrupar y
 * graficar sin cruzar colecciones.
 */
export type GameLevelResultDocument = {
  attemptId: string;
  studentRut: string;
  gameId: "color-sequence" | "mini-cases" | "node-connection";
  /** Unico dentro del intento: reenviar el mismo resultado no lo duplica. */
  key: string;
  index: number;
  tryNumber: number;
  sessionId: string;
  student: Record<string, unknown>;
  /** Metricas propias de cada juego (ver lib/gameAttempts.ts). */
  metrics: Record<string, unknown>;
  /**
   * Eventos finos del nivel, con su tiempo (ver lib/attemptEvents.ts):
   * toques de la respuesta en seriacion; trazos, deshacer, reinicios y
   * bloqueos en nodos. Vacio en mini casos (su detalle va en `metrics`) y en
   * niveles jugados antes de registrarlos.
   */
  events: unknown[];
  /** Tiempo con la pestana visible. */
  activeMsGross: number;
  /** Tiempo visible sin contar inactividad de mas de 80 s. */
  activeMsNet: number;
  completedAt: Date;
  device: Record<string, unknown>;
};

const gameLevelResultSchema = new Schema<GameLevelResultDocument>(
  {
    attemptId: { type: String, required: true },
    studentRut: { type: String, required: true },
    gameId: {
      type: String,
      enum: ["color-sequence", "mini-cases", "node-connection"],
      required: true,
    },
    key: { type: String, required: true },
    index: { type: Number, required: true },
    tryNumber: { type: Number, required: true, default: 1 },
    sessionId: { type: String, required: true },
    student: { type: Schema.Types.Mixed, required: true },
    metrics: { type: Schema.Types.Mixed, required: true },
    events: { type: [Schema.Types.Mixed], default: [] },
    activeMsGross: { type: Number, required: true },
    activeMsNet: { type: Number, required: true },
    completedAt: { type: Date, required: true },
    device: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

gameLevelResultSchema.index({ attemptId: 1, key: 1 }, { unique: true });
gameLevelResultSchema.index({ gameId: 1, index: 1 });
gameLevelResultSchema.index({ studentRut: 1, gameId: 1 });

export const GameLevelResult =
  models.GameLevelResult ||
  model<GameLevelResultDocument>("GameLevelResult", gameLevelResultSchema);
