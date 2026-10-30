import { MINI_CASES_SEED } from "./miniCasesSeed";
import { MiniCase } from "./models/MiniCase";

/**
 * Titulos que tuvieron los casos 1 a 10 antes de usar los nombres del documento «JUEGOS ABSTRACTOS - FE»
 * (eran propuestas provisorias). Un caso cuyo titulo siga siendo uno de estos se actualiza solo; uno que el
 * administrador ya corrigio a mano no se toca.
 */
const PROVISIONAL_TITLES = [
  "Área de Lectoescritura Inicial y Detección Pedagógica",
  "Área de Colaboración con el Docente de Aula",
  "Área de Planificación del Aprendizaje en Primer Ciclo",
  "Área de Regulación Emocional y Transiciones",
  "Área de Evaluación de la Comprensión Lectora",
  "Área de Interculturalidad y Diversidad Lingüística",
  "Área de Juego y Tolerancia a la Frustración",
  "Área de Resolución de Problemas Matemáticos",
  "Área de Sospecha Diagnóstica y Discapacidad Intelectual",
  "Área de Autorregulación y Trabajo Científico",
];

/**
 * Deja el banco con los 25 casos base. Es idempotente y no pisa lo que el administrador ya edito:
 *  - agrega los casos que falten (por caseKey);
 *  - pone el nombre de area a los que no tienen titulo o conservan uno provisorio;
 *  - pone la imagen a los que no tienen;
 */
export async function ensureBaseMiniCases(): Promise<void> {
  await MiniCase.bulkWrite(
    MINI_CASES_SEED.map((c) => ({
      updateOne: {
        filter: { caseKey: c.caseKey },
        update: {
          $setOnInsert: {
            title: c.title,
            imageKey: c.imageKey,
            baseText: c.baseText,
            twistText: c.twistText,
            promptText: c.promptText,
            options: c.options,
            feedback: c.feedback,
            alternateOrders: c.alternateOrders ?? [],
          },
        },
        upsert: true,
      },
    })),
  );

  await MiniCase.bulkWrite(
    MINI_CASES_SEED.flatMap((c) => [
      {
        updateOne: {
          filter: {
            caseKey: c.caseKey,
            $or: [
              { title: { $exists: false } },
              { title: "" },
              { title: { $in: PROVISIONAL_TITLES } },
              { title: { $regex: /^\s*mini\s*caso/i } },
            ],
          },
          update: { $set: { title: c.title } },
        },
      },
      {
        updateOne: {
          filter: {
            caseKey: c.caseKey,
            $or: [{ imageKey: { $exists: false } }, { imageKey: null }, { imageKey: "" }],
          },
          update: { $set: { imageKey: c.imageKey } },
        },
      },
    ]),
  );
}

/** Tareas que corren una vez por proceso, al abrir la conexion (ver connectDB). */
export async function runStartupTasks(): Promise<void> {
  await ensureBaseMiniCases();
}
