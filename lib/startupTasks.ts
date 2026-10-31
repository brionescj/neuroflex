import mongoose from "mongoose";

import { normalizeCommune } from "./communes.js";
import { MINI_CASES_SEED } from "./miniCasesSeed.js";
import { GameAttempt } from "./models/GameAttempt.js";
import { MiniCase } from "./models/MiniCase.js";
import { Student } from "./models/Student.js";
import { normalizeRegion } from "./region.js";

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

/**
 * Corre `task` una sola vez en toda la base (no una vez por proceso): deja una marca en la coleccion
 * «migrations» cuando termina bien. Si falla, no deja marca y se reintenta en el proximo arranque.
 */
async function once(name: string, task: () => Promise<void>): Promise<void> {
  const marks = mongoose.connection.collection<{ _id: string; at: Date }>("migrations");

  if (await marks.findOne({ _id: name })) return;

  await task();
  await marks.updateOne({ _id: name }, { $setOnInsert: { at: new Date() } }, { upsert: true });
}

/**
 * «Ciudad» pasa a llamarse «comuna» en toda la base: en la ficha de cada estudiante y en la copia de sus datos
 * que guarda cada partida. La region se deja con su nombre oficial y la comuna, cuando coincide con una de esa
 * region, tambien. Una comuna que no coincide con ninguna se conserva tal cual (no se inventa un dato); el
 * estudiante o el administrador la elige de la lista cuando la corrija.
 */
export async function renameCityToCommune(): Promise<void> {
  const legacy = await Student.collection
    .find({ ciudad: { $exists: true } }, { projection: { ciudad: 1, region: 1, comuna: 1 } })
    .toArray();

  const operations = legacy.map((doc) => {
    const set: Record<string, string> = {};
    const region = typeof doc.region === "string" ? normalizeRegion(doc.region) : null;
    const city = typeof doc.ciudad === "string" ? doc.ciudad.trim() : "";

    if (region && region !== doc.region) set.region = region;

    // Una comuna que ya estaba cargada no se pisa con la ciudad antigua.
    if (typeof doc.comuna !== "string" && city !== "") {
      set.comuna = (region ? normalizeCommune(region, city) : null) ?? city;
    }

    return {
      updateOne: {
        filter: { _id: doc._id },
        update: { ...(Object.keys(set).length > 0 ? { $set: set } : {}), $unset: { ciudad: "" } },
      },
    };
  });

  if (operations.length > 0) await Student.collection.bulkWrite(operations);

  await GameAttempt.collection.updateMany(
    { "student.ciudad": { $exists: true } },
    { $rename: { "student.ciudad": "student.comuna" } },
  );
}

/** Tareas que corren una vez por proceso, al abrir la conexion (ver connectDB). */
export async function runStartupTasks(): Promise<void> {
  await ensureBaseMiniCases();
  await once("ciudad-a-comuna", renameCityToCommune);
}
