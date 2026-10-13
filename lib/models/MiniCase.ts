import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type MiniCaseOptionDocument = {
  optionKey: string;
  text: string;
  correctStep: 1 | 2 | 3 | 4;
};

export type MiniCaseDocument = {
  caseKey: string;
  title: string;
  baseText: string;
  twistText: string;
  promptText: string;
  options: MiniCaseOptionDocument[];
  feedback: string;
  enabled: boolean;
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
    feedback: { type: String, required: true },
    // Permite retirar un caso del banco sin borrarlo (igual que isDeleted
    // en Student, pero mas simple: esto no es informacion de una persona,
    // no necesita motivo/quien/cuando).
    enabled: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

export const MiniCase =
  models.MiniCase || model<MiniCaseDocument>("MiniCase", miniCaseSchema);
