/**
 * Nucleo del script server-scripts/removeTeachers.ts: lo que hay que quitar de
 * la base del rol de docente y como se quita. Separado del script para poder
 * probarlo sin una base real.
 */
const TEACHERS = "teachers";
const ACCOUNTS = "authusers";

type Doc = { _id: unknown; rut?: unknown };

/** Lo minimo que se usa de la base (la `Db` de mongoose lo cumple). */
export type DbLike = {
  listCollections: (filter: { name: string }) => { toArray: () => Promise<unknown[]> };
  collection: (name: string) => {
    find: (filter?: Record<string, unknown>) => { toArray: () => Promise<Doc[]> };
    deleteMany: (filter: Record<string, unknown>) => Promise<{ deletedCount: number }>;
    drop: () => Promise<unknown>;
  };
};

export type TeacherLeftovers = {
  hasCollection: boolean;
  teachers: Doc[];
  accounts: Doc[];
};

export type RemovalResult = TeacherLeftovers & {
  applied: boolean;
  accountsDeleted: number;
};

/** Lo que queda del rol de docente en la base. No modifica nada. */
export async function findTeacherLeftovers(db: DbLike): Promise<TeacherLeftovers> {
  const hasCollection = (await db.listCollections({ name: TEACHERS }).toArray()).length > 0;
  const teachers = hasCollection ? await db.collection(TEACHERS).find().toArray() : [];
  const accounts = await db.collection(ACCOUNTS).find({ role: "teacher" }).toArray();

  return { hasCollection, teachers, accounts };
}

/**
 * Con `apply` en falso solo informa. Con `apply` en verdad llama primero a
 * `backup` y, si esa llamada falla, no borra nada. Solo se borran las cuentas
 * que estaban en el respaldo, no otras que aparezcan despues.
 */
export async function removeTeachers(
  db: DbLike,
  options: { apply: boolean; backup: (leftovers: TeacherLeftovers) => Promise<void> | void },
): Promise<RemovalResult> {
  const leftovers = await findTeacherLeftovers(db);
  const nothingLeft = !leftovers.hasCollection && leftovers.accounts.length === 0;

  if (!options.apply || nothingLeft) {
    return { ...leftovers, applied: false, accountsDeleted: 0 };
  }

  await options.backup(leftovers);

  const { deletedCount } = await db
    .collection(ACCOUNTS)
    .deleteMany({ _id: { $in: leftovers.accounts.map((account) => account._id) }, role: "teacher" });

  if (leftovers.hasCollection) await db.collection(TEACHERS).drop();

  return { ...leftovers, applied: true, accountsDeleted: deletedCount };
}
