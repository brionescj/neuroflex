/**
 * Deja la base en limpio para salir a produccion: borra TODOS los datos de prueba (estudiantes, administradores,
 * cuentas de acceso, partidas, resultados, puntuaciones, desbloqueos, sesiones de juego...) y deja solo dos cuentas:
 * el administrador y un estudiante de prueba (ver lib/resetDatabase.ts).
 *
 * Por defecto CONSERVA el banco de mini casos (es contenido del juego, no un dato de prueba) y las marcas de
 * migracion. Con --include-mini-cases tambien vacia el banco: al arrancar, el servidor vuelve a cargar los 25 casos
 * base, pero se pierde cualquier caso que se haya editado o agregado desde el panel.
 *
 *   npx tsx --env-file=.env.local server-scripts/resetDatabase.ts                                  # solo muestra el plan
 *   npx tsx --env-file=.env.local server-scripts/resetDatabase.ts --apply --confirm=NOMBRE_BASE    # respalda, borra y deja las cuentas
 *
 * Sin --apply no escribe ni borra nada. Para aplicar hay que repetir el nombre de la base en --confirm (el script lo
 * imprime): asi no se borra la base equivocada por un copiar y pegar. Antes de borrar guarda un respaldo en
 * server-scripts/backups/ (incluye los hash de contrasena: es privado, esa carpeta esta en .gitignore) y no borra si
 * el respaldo falla. ES IRREVERSIBLE salvo por ese respaldo.
 *
 * Contrasenas: se generan al azar y se muestran UNA sola vez al terminar (no se guardan en ningun archivo). Para
 * elegirlas tu, define NEUROFLEX_ADMIN_PASSWORD y NEUROFLEX_STUDENT_PASSWORD en el entorno; deben cumplir las reglas.
 */
import { mkdirSync, writeFileSync } from "node:fs";

import mongoose from "mongoose";

import { generatePassword, hashPassword } from "../lib/password";
import { buildSeedAccounts, checkPassword, resetDatabase, type DbLike } from "../lib/resetDatabase";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const includeMiniCases = args.includes("--include-mini-cases");
const confirm = args.find((arg) => arg.startsWith("--confirm="))?.slice("--confirm=".length);

function target(uri: string): string {
  try {
    const url = new URL(uri);

    return `${url.host}${url.pathname}`;
  } catch {
    return "(no se pudo leer el destino)";
  }
}

function chosenPassword(variable: string, label: string): { password: string; generated: boolean } {
  const given = process.env[variable];

  if (given === undefined || given === "") return { password: generatePassword(), generated: true };

  checkPassword(label, given);

  return { password: given, generated: false };
}

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("Falta MONGODB_URI. Uso: npx tsx --env-file=.env.local server-scripts/resetDatabase.ts [--apply --confirm=NOMBRE_BASE]");
    process.exit(1);
  }

  console.log(`Base de datos: ${target(uri)}`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  const db = mongoose.connection.db;

  if (!db) throw new Error("No hay conexion con la base.");

  const dbName = mongoose.connection.name;

  if (apply && confirm !== dbName) {
    console.error(`\nNo se borro nada. Para aplicar repite el nombre de la base: --apply --confirm=${dbName}`);
    process.exit(1);
  }

  // Estos modelos solo sirven para saber como se llaman las colecciones.
  const { Admin } = await import("../lib/models/Admin");
  const { AuthUser } = await import("../lib/models/AuthUser");
  const { Student } = await import("../lib/models/Student");

  const admin = chosenPassword("NEUROFLEX_ADMIN_PASSWORD", "Contraseña del administrador");
  const student = chosenPassword("NEUROFLEX_STUDENT_PASSWORD", "Contraseña del estudiante de prueba");
  const accounts = buildSeedAccounts();

  const result = await resetDatabase(db as unknown as DbLike, {
    apply,
    includeMiniCases,
    seed: [
      { collection: Admin.collection.name, docs: [accounts.admin.profile] },
      { collection: Student.collection.name, docs: [accounts.student.profile] },
      {
        collection: AuthUser.collection.name,
        docs: [
          { ...accounts.admin.account, password: await hashPassword(admin.password) },
          { ...accounts.student.account, password: await hashPassword(student.password) },
        ],
      },
    ],
    backup: (contents) => {
      mkdirSync(new URL("./backups/", import.meta.url), { recursive: true });

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const name = `base-completa-${stamp}.json`;

      writeFileSync(new URL(`./backups/${name}`, import.meta.url), JSON.stringify(contents, null, 2), "utf8");
      console.log(`Respaldo guardado en server-scripts/backups/${name}`);
    },
  });

  console.log(`\n${result.applied ? "Colecciones vaciadas" : "Se vaciarian"}:`);
  for (const { name, count } of result.cleared) console.log(`  ${name.padEnd(24)} ${count} documentos`);

  console.log("\nSe conservan:");
  for (const { name, count } of result.kept) console.log(`  ${name.padEnd(24)} ${count} documentos`);

  console.log(`\nCuentas que quedan: administrador ${accounts.admin.account.rut} y estudiante de prueba ${accounts.student.account.rut}.`);

  if (!result.applied) {
    console.log(`\nNo se modifico nada. Para aplicar: --apply --confirm=${dbName}`);
    return;
  }

  console.log("\nContraseñas (anotalas AHORA: no se guardan en ningun lado):");
  console.log(`  administrador ${accounts.admin.account.rut}   ${admin.generated ? admin.password : "(la que definiste en NEUROFLEX_ADMIN_PASSWORD)"}`);
  console.log(`  estudiante    ${accounts.student.account.rut}   ${student.generated ? student.password : "(la que definiste en NEUROFLEX_STUDENT_PASSWORD)"}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
