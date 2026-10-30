import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type MiniCaseOptionDocument = {
  optionKey: string;
  text: string;
  correctStep: 1 | 2 | 3 | 4;
};

export type MiniCaseDocument = {
  caseKey: string;
  /** Titulo que ve el estudiante, solo el area («Área de Lenguaje y Comunicación»), sin numero de caso. */
  title: string;
  /** Clave del dibujo del catalogo (lib/miniCaseImages.ts) que se muestra como distractor. */
  imageKey?: string;
  baseText: string;
  twistText: string;
  promptText: string;
  options: MiniCaseOptionDocument[];
  /**
   * Otras secuencias que tambien son correctas, ademas de la que marcan los
   * correctStep. Cada una lista las 4 optionKey en orden. Casi todos los
   * casos no tienen ninguna.
   */
  alternateOrders: string[][];
  feedback: string;
};

const miniCaseOptionSchema = new Schema<MiniCaseOptionDocument>(
  {
    optionKey: { type: String, required: true },
    text: { type: String, required: true },
    correctStep: { type: Number, enum: [1, 2, 3, 4], required: true },
  },
  { _id: false },
);

const miniCaseSchema = new Schema<MiniCaseDocument>(
  {
    caseKey: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    imageKey: { type: String },
    baseText: { type: String, required: true },
    twistText: { type: String, required: true },
    promptText: { type: String, required: true },
    options: {
      type: [miniCaseOptionSchema],
      required: true,
      validate: {
        validator: (opts: MiniCaseOptionDocument[]) => opts.length === 4,
        message: "Cada mini caso debe tener exactamente 4 opciones.",
      },
    },
    alternateOrders: { type: [[String]], default: [] },
    feedback: { type: String, required: true },
  },
  { timestamps: true },
);

export const MiniCase =
  models.MiniCase || model<MiniCaseDocument>("MiniCase", miniCaseSchema);
