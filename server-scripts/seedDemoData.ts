/**
 * Datos de prueba para ver las estadisticas: completa las fichas de la lista de
 * estudiantes (correo, universidad, nacimiento, paralelo 1 y jornada) e inventa
 * sus partidas de juego. TODO lo inventado se puede quitar con --purge.
 *
 *   npx tsx --env-file=.env.local server-scripts/seedDemoData.ts             # solo muestra el plan
 *   npx tsx --env-file=.env.local server-scripts/seedDemoData.ts --apply     # escribe en la base
 *   npx tsx --env-file=.env.local server-scripts/seedDemoData.ts --purge     # borra las partidas inventadas
 *
 * Escribe directo en la base a la que apunte MONGODB_URI: revisa el destino que
 * imprime antes de usar --apply. Las partidas inventadas llevan el prefijo
 * "demo-" en su attemptId y los desbloqueos, source "demo-seed"; eso es lo que
 * --purge borra. Los datos de las fichas (correo, nacimiento...) NO se
 * restauran con --purge: se pisan, y la lista original sigue en roster-2.json.
 */
import { readFileSync } from "node:fs";

import { attemptDocuments, resultDocuments } from "../lib/demo/documents";
import { ATTEMPT_PREFIX, planStudent, type DemoMiniCase } from "../lib/demo/plan";
import { buildProfiles, type RosterRow } from "../lib/demo/profiles";
import { emailProblem } from "../lib/email";
import { MINI_CASES_RULE_VERSION } from "../lib/gameUnlocks";
import { normalizeForDatabase } from "../lib/rut";

const DEMO_SOURCE = "demo-seed";
const ROSTER_PATH = new URL("./roster-2.json", import.meta.url);
const CHUNK = 500;

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const purgeOnly = args.has("--purge");

function target(uri: string): string {
  try {
    const url = new URL(uri);

    return `${url.host}${url.pathname}`;
  } catch {
    return "(no se pudo leer el destino)";
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("Falta MONGODB_URI. Uso: npx tsx --env-file=.env.local server-scripts/seedDemoData.ts [--apply | --purge]");
    process.exit(1);
  }

  // Estos modulos leen la variable de entorno al cargarse: se importan despues de comprobarla.
  const { connectDB } = await import("../lib/db");
  const { Student } = await import("../lib/models/Student");
  const { GameAttempt } = await import("../lib/models/GameAttempt");
  const { GameLevelResult } = await import("../lib/models/GameLevelResult");
  const { GameUnlock } = await import("../lib/models/GameUnlock");
  const { MiniCase } = await import("../lib/models/MiniCase");
  const { MINI_CASES_CONTENT_VERSION } = await import("../lib/gameAttemptsStore");

  console.log(`Base de datos: ${target(process.env.MONGODB_URI)}`);
  await connectDB();

  const demoAttempt = { attemptId: { $regex: `^${ATTEMPT_PREFIX}` } };

  async function purge() {
    const results = await GameLevelResult.deleteMany(demoAttempt);
    const attempts = await GameAttempt.deleteMany(demoAttempt);
    const unlocks = await GameUnlock.deleteMany({ source: DEMO_SOURCE });

    console.log(
      `Borrado: ${attempts.deletedCount} partidas, ${results.deletedCount} resultados, ${unlocks.deletedCount} desbloqueos.`,
    );
  }

  if (purgeOnly) {
    await purge();
    return;
  }

  // ---- Lista de estudiantes con su correo.
  const roster = JSON.parse(readFileSync(ROSTER_PATH, "utf8")) as { rut: string; email?: string }[];
  const rows: RosterRow[] = roster
    .filter((row) => row.email)
    .map((row) => ({ rut: normalizeForDatabase(row.rut), email: row.email as string }));

  const profiles = buildProfiles(rows, new Date());
  const invalid = profiles.filter((p) => emailProblem(p.email) !== null);

  if (invalid.length > 0) {
    console.error(`Hay ${invalid.length} correos que el sistema no acepta aun despues de quitar las tildes.`);
    process.exit(1);
  }

  const students = (await Student.find({ rut: { $in: profiles.map((p) => p.rut) }, isDeleted: false }).lean()) as Record<string, unknown>[];
  const byRut = new Map(students.map((s) => [s.rut as string, s]));
  const missing = profiles.filter((p) => !byRut.has(p.rut));

  const cases = (await MiniCase.find().sort({ caseKey: 1 }).lean()) as {
    caseKey: string;
    options: DemoMiniCase["options"];
    alternateOrders?: string[][];
  }[];

  if (cases.length === 0) {
    console.error("No hay Mini casos en la base. El banco se carga solo al abrir la conexion (lib/startupTasks.ts): vuelve a ejecutar el script.");
    process.exit(1);
  }

  const miniCases: DemoMiniCase[] = cases.map((c) => ({
    caseKey: c.caseKey,
    options: c.options.map((o) => ({ optionKey: o.optionKey, text: o.text, correctStep: o.correctStep })),
    alternateOrders: c.alternateOrders ?? [],
  }));
  const miniCasesVersion = MINI_CASES_CONTENT_VERSION;
  const now = new Date();

  // ---- Plan por estudiante (sin tocar la base todavia).
  const plans: { profile: (typeof profiles)[number]; plan: ReturnType<typeof planStudent> }[] = [];

  for (const profile of profiles) {
    const current = byRut.get(profile.rut);

    if (!current) continue;

    const existingAttempts: Record<string, number> = {};

    for (const gameId of ["color-sequence", "node-connection", "mini-cases"]) {
      existingAttempts[gameId] = await GameAttempt.countDocuments({
        studentRut: profile.rut,
        gameId,
        attemptId: { $not: new RegExp(`^${ATTEMPT_PREFIX}`) },
      });
    }

    const student = {
      ...current,
      paralelo: profile.paralelo,
      birthDate: profile.birthDate,
      studyShift: profile.studyShift,
      university: profile.university,
    };

    plans.push({ profile, plan: planStudent({ profile, student, miniCases, miniCasesVersion, now, existingAttempts }) });
  }

  const attempts = plans.flatMap((p) => p.plan.attempts);
  const resultCount = attempts.reduce((sum, a) => sum + a.results.length, 0);
  const unlocked = plans.filter((p) => p.plan.unlock).length;
  const byGame = (game: string) => attempts.filter((a) => a.gameId === game && a.status !== "in_progress").length;

  console.log(`\nEstudiantes de la lista: ${profiles.length} (${byRut.size} existen en la base, ${missing.length} no).`);
  console.log(`  Cambian a @alumno.st.cl (Santo Tomás): ${profiles.filter((p) => p.university === "santo-tomas").length}`);
  console.log(`  Jornada diurna / vespertina: ${profiles.filter((p) => p.studyShift === "day").length} / ${profiles.filter((p) => p.studyShift === "evening").length}`);
  console.log(`Partidas: ${attempts.length} (${resultCount} resultados)`);
  console.log(`  cerradas: seriación ${byGame("color-sequence")}, nodos ${byGame("node-connection")}, mini casos ${byGame("mini-cases")}`);
  console.log(`  a medias (abandonadas): ${attempts.filter((a) => a.status === "in_progress").length}`);
  console.log(`Mini casos desbloqueado: ${unlocked} estudiantes; sin desbloquear: ${plans.length - unlocked}`);

  if (missing.length > 0) {
    console.log(`\nAviso: ${missing.length} RUT de la lista no están en la base y se omiten (carga primero la lista con seedRoster2.ts).`);
  }

  if (!apply) {
    console.log("\nNo se escribió nada. Agrega --apply para guardarlo.");
    return;
  }

  // ---- Escritura: primero se quita lo inventado antes, asi correrlo dos veces no duplica.
  await purge();

  for (const { profile } of plans) {
    await Student.updateOne(
      { rut: profile.rut },
      {
        $set: {
          email: profile.email,
          birthDate: profile.birthDate,
          studyShift: profile.studyShift,
          paralelo: profile.paralelo,
          university: profile.university,
        },
      },
    );
  }

  console.log(`Fichas actualizadas: ${plans.length}`);

  const attemptDocs = plans.flatMap(({ profile, plan }) => attemptDocuments(profile.rut, plan));
  const resultDocs = plans.flatMap(({ profile, plan }) => resultDocuments(profile.rut, plan));

  for (let i = 0; i < attemptDocs.length; i += CHUNK) {
    await GameAttempt.insertMany(attemptDocs.slice(i, i + CHUNK), { ordered: false });
  }

  for (let i = 0; i < resultDocs.length; i += CHUNK) {
    await GameLevelResult.insertMany(resultDocs.slice(i, i + CHUNK), { ordered: false });
  }

  let skippedUnlocks = 0;

  for (const { profile, plan } of plans) {
    if (!plan.unlock) continue;

    // Si el estudiante ya lo desbloqueo de verdad, se respeta ese registro.
    const real = await GameUnlock.findOne({ studentRut: profile.rut, gameId: "mini-cases", source: { $ne: DEMO_SOURCE } }).lean();

    if (real) {
      skippedUnlocks += 1;
      continue;
    }

    await GameUnlock.updateOne(
      { studentRut: profile.rut, gameId: "mini-cases" },
      {
        $set: {
          unlockedAt: plan.unlock.unlockedAt,
          source: DEMO_SOURCE,
          rule: MINI_CASES_RULE_VERSION,
          evidence: plan.unlock.evidence,
        },
      },
      { upsert: true },
    );
  }

  console.log(`Guardado: ${attemptDocs.length} partidas, ${resultDocs.length} resultados, ${unlocked - skippedUnlocks} desbloqueos.`);
  console.log("Listo. Para quitar las partidas inventadas: --purge");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
