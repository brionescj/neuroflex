/**
 * Quita de la base todo lo que quedo del rol de docente (el rol se elimino a
 * pedido del cliente): la coleccion "teachers" y las cuentas de acceso con
 * role "teacher". Es la UNICA excepcion a la regla de no borrar usuarios.
 *
 *   npx tsx --env-file=.env.local server-scripts/removeTeachers.ts             # solo muestra que borraria
 *   npx tsx --env-file=.env.local server-scripts/removeTeachers.ts --apply     # respalda y borra
 *
 * Sin --apply no escribe ni borra nada. Con --apply, antes de borrar guarda un
 * respaldo en server-scripts/backups/ (incluye los hash de contrasena: es
 * privado, esa carpeta esta en .gitignore) y no borra si el respaldo falla.
 * Es irreversible: revisa el destino que imprime antes de usar --apply.
 * Se puede volver a ejecutar sin problema; si no queda nada, no hace nada.
 */
import { mkdirSync, writeFileSync } from "node:fs";

import mongoose from "mongoose";

import { removeTeachers, type DbLike } from "../lib/removeTeachers";

const apply = process.argv.slice(2).includes("--apply");

function target(uri: string): string {
  try {
    const url = new URL(uri);

    return `${url.host}${url.pathname}`;
  } catch {
    return "(no se pudo leer el destino)";
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("Falta MONGODB_URI. Uso: npx tsx --env-file=.env.local server-scripts/removeTeachers.ts [--apply]");
    process.exit(1);
  }

  console.log(`Base de datos: ${target(uri)}`);
  await mongoose.connect(uri);

  const db = mongoose.connection.db;

  if (!db) throw new Error("No hay conexion con la base.");

  const result = await removeTeachers(db as unknown as DbLike, {
    apply,
    backup: (leftovers) => {
      mkdirSync(new URL("./backups/", import.meta.url), { recursive: true });

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = new URL(`./backups/docentes-${stamp}.json`, import.meta.url);

      writeFileSync(file, JSON.stringify({ teachers: leftovers.teachers, accounts: leftovers.accounts }, null, 2), "utf8");
      console.log(`Respaldo guardado en server-scripts/backups/${file.pathname.split("/").pop()}`);
    },
  });

  console.log(`Fichas de docente (coleccion "teachers"): ${result.teachers.length}`);
  for (const teacher of result.teachers) console.log(`  ficha   ${String(teacher.rut)}`);
  console.log(`Cuentas de acceso con rol docente: ${result.accounts.length}`);
  for (const account of result.accounts) console.log(`  cuenta  ${String(account.rut)}`);

  if (result.applied) {
    console.log(`\nListo. Cuentas borradas: ${result.accountsDeleted}. Coleccion "teachers" eliminada.`);
  } else if (!result.hasCollection && result.accounts.length === 0) {
    console.log("\nNo queda nada del rol de docente. Nada que hacer.");
  } else {
    console.log("\nSolo vista previa: no se borro nada. Para borrar, repite el comando con --apply.");
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
