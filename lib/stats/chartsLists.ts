import { isColorSequenceResultPassed } from "../gameAttempts";
import { MINI_CASES_UNLOCK_LEVEL } from "../gameUnlocks";
import { cohortOf, countLabel, isAbandoned, type ChartDef, type Ctx } from "./engine";
import { studentName } from "./pipeline";
import {
  GAME_IDS,
  GAME_LABELS,
  type AttemptRow,
  type ChartOptionDef,
  type ChartTable,
  type GameId,
  type ResultRow,
  type StudentRow,
  type UnlockRow,
} from "./types";

/**
 * Listas de estudiantes para saber a quien abordar: quien dejo de jugar, quien
 * esta estancado, quien repite partidas fallidas o abandonadas y quien aun no
 * desbloquea Mini casos. Son tablas (sin grafico): se comparan por filas, no por grupos.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const LIST_BASE: Pick<ChartDef, "game" | "views" | "compare" | "usesPartida" | "supportsDevice"> = {
  game: "general",
  views: [],
  compare: false,
  usesPartida: false,
  supportsDevice: false,
};

export const universityText = (value: string | null | undefined) =>
  value === "santo-tomas" ? "Santo Tomás" : value === "uvm" ? "UVM" : "";

export const shiftText = (value: string | null | undefined) =>
  value === "day" ? "Diurna" : value === "evening" ? "Vespertina" : "";

export const fullName = (student: StudentRow) =>
  `${studentName(student, student.rut)}${student.maternalLastName ? ` ${student.maternalLastName}` : ""}`;

/** Fecha corta en hora de Chile, para las columnas de las listas. */
export function chileDate(at: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Santiago",
  })
    .format(at)
    .replace(/\./g, "");
}

/** Los primeros datos de cada fila: quien es. */
const BASE_COLUMNS = ["Estudiante", "RUT", "Paralelo", "Universidad"];

export const baseCells = (student: StudentRow) => [
  fullName(student),
  student.rut,
  student.paralelo ?? "",
  universityText(student.university),
];

const byName = (a: StudentRow, b: StudentRow) =>
  a.paternalLastName.localeCompare(b.paternalLastName, "es") || a.firstName.localeCompare(b.firstName, "es");

/** Los estudiantes habilitados que cumplen los filtros de ficha, en orden alfabetico. */
export function listCohort(ctx: Ctx): StudentRow[] {
  const grouped = cohortOf(ctx);

  return grouped.specs.flatMap((spec) => grouped.byGroup.get(spec.key) ?? []).sort(byName);
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const list = map.get(keyOf(item)) ?? [];

    list.push(item);
    map.set(keyOf(item), list);
  }

  return map;
}

function gameFilter(ctx: Ctx): (attempt: AttemptRow) => boolean {
  const game = ctx.options.game;

  return (attempt) => game === undefined || game === "all" || attempt.gameId === game;
}

function gameNote(ctx: Ctx): string {
  const game = ctx.options.game;

  return game === undefined || game === "all" ? "Se suman los tres juegos." : `Solo ${GAME_LABELS[game as GameId]}.`;
}

type ListBuilt = {
  columns: string[];
  rows: (string | number | null)[][];
  notes: string[];
  total: number;
};

function listResult(table: ListBuilt) {
  const { columns, rows, notes, total } = table;
  const asTable: ChartTable = { columns, rows };

  return {
    xLabel: "",
    yLabel: "",
    unit: "students" as const,
    unitLabel: "estudiantes",
    categories: [],
    series: [],
    table: asTable,
    notes: [
      ...notes,
      rows.length === 0
        ? "Ningún estudiante habilitado que cumple los filtros está en esta lista."
        : `${countLabel("estudiantes")}: ${rows.length} de ${total} habilitados que cumplen los filtros.`,
    ],
    studentsTotal: rows.length,
  };
}

// ----------------------------------------------------------- dejaron de jugar

const DAYS_OPTION: ChartOptionDef = {
  id: "days",
  label: "Sin jugar hace más de",
  default: "3",
  choices: [
    { value: "3", label: "3 días" },
    { value: "7", label: "7 días" },
    { value: "14", label: "14 días" },
    { value: "30", label: "30 días" },
  ],
};

const GAME_ANY: ChartOptionDef = {
  id: "game",
  label: "Juego",
  default: "all",
  choices: [{ value: "all", label: "Todos" }, ...GAME_IDS.map((id) => ({ value: id, label: GAME_LABELS[id] }))],
};

const genInactive: ChartDef = {
  id: "gen-inactive",
  ...LIST_BASE,
  title: "Dejaron de jugar",
  blurb:
    "Estudiantes habilitados que ya jugaron alguna vez pero llevan varios días sin hacerlo. Sirve para saber a quién recordarle que vuelva. Quienes nunca han jugado están en «Estudiantes sin partidas».",
  options: [DAYS_OPTION, GAME_ANY],
  build: (ctx) => {
    const days = Number(ctx.options.days);
    const wanted = gameFilter(ctx);
    const attemptsBy = groupBy(ctx.data.attempts.filter(wanted), (attempt) => attempt.studentRut);
    const cohort = listCohort(ctx);
    const rows: { sort: number; cells: (string | number | null)[] }[] = [];

    for (const student of cohort) {
      const attempts = attemptsBy.get(student.rut);

      if (!attempts || attempts.length === 0) continue;

      const last = attempts.reduce((a, b) => (b.lastActivityAt > a.lastActivityAt ? b : a));
      const idle = ctx.now.getTime() - last.lastActivityAt.getTime();

      if (idle <= days * DAY_MS) continue;

      rows.push({
        sort: idle,
        cells: [
          ...baseCells(student),
          chileDate(last.lastActivityAt),
          Math.floor(idle / DAY_MS),
          attempts.length,
          GAME_LABELS[last.gameId],
        ],
      });
    }

    rows.sort((a, b) => b.sort - a.sort);

    return listResult({
      columns: [...BASE_COLUMNS, "Última actividad", "Días sin jugar", "Partidas jugadas", "Último juego"],
      rows: rows.map((row) => row.cells),
      notes: [
        gameNote(ctx),
        `Estudiantes que jugaron alguna vez y cuya última actividad fue hace más de ${days} días. Se ordenan de más a menos tiempo sin jugar.`,
      ],
      total: cohort.length,
    });
  },
};

// ------------------------------------------------------------------ estancados

const STUCK_GAME_OPTION: ChartOptionDef = {
  id: "game",
  label: "Juego",
  default: "color-sequence",
  choices: [
    { value: "color-sequence", label: GAME_LABELS["color-sequence"] },
    { value: "node-connection", label: GAME_LABELS["node-connection"] },
  ],
};

const STUCK_OPTION: ChartOptionDef = {
  id: "stuck",
  label: "Partidas seguidas sin avanzar",
  default: "4",
  choices: ["2", "3", "4", "5", "6"].map((value) => ({ value, label: `${value} o más` })),
};

/** El nivel mas alto que se logro en una partida: aprobado en Seriación, completado en Nodos. */
function levelOfAttempt(results: ResultRow[], game: GameId): number {
  return results
    .filter((result) => game === "node-connection" || isColorSequenceResultPassed(result))
    .reduce((max, result) => Math.max(max, result.index), 0);
}

/**
 * Cuantas de las ultimas partidas seguidas no superaron el mejor nivel que el
 * estudiante ya tenia. Una partida que sigue en curso no cuenta: todavia puede avanzar.
 */
export function stuckStreak(levels: number[]): { streak: number; best: number } {
  let best = 0;
  let streak = 0;

  for (const level of levels) {
    if (level > best) {
      best = level;
      streak = 0;
    } else {
      streak += 1;
    }
  }

  return { streak, best };
}

const genStuck: ChartDef = {
  id: "gen-stuck",
  ...LIST_BASE,
  title: "Estudiantes estancados",
  blurb:
    "Estudiantes que juegan una y otra vez sin llegar a un nivel más alto que el que ya tenían. Sirve para saber a quién ayudar o revisar si un nivel está siendo demasiado difícil.",
  options: [STUCK_GAME_OPTION, STUCK_OPTION],
  build: (ctx) => {
    const game = ctx.options.game as GameId;
    const needed = Number(ctx.options.stuck);
    const cohort = listCohort(ctx);
    const attemptsBy = groupBy(
      ctx.data.attempts.filter((attempt) => attempt.gameId === game && !(attempt.status === "in_progress" && !isAbandoned(attempt, ctx.now))),
      (attempt) => attempt.studentRut,
    );
    const resultsBy = groupBy(
      ctx.data.results.filter((result) => result.gameId === game),
      (result) => result.attemptId,
    );
    const rows: { streak: number; cells: (string | number | null)[] }[] = [];

    for (const student of cohort) {
      const attempts = [...(attemptsBy.get(student.rut) ?? [])].sort((a, b) => a.attemptNumber - b.attemptNumber);

      if (attempts.length === 0) continue;

      const { streak, best } = stuckStreak(
        attempts.map((attempt) => levelOfAttempt(resultsBy.get(attempt.attemptId) ?? [], game)),
      );

      if (streak < needed) continue;

      const last = attempts[attempts.length - 1] as AttemptRow;

      rows.push({
        streak,
        cells: [...baseCells(student), best === 0 ? "Ninguno" : best, streak, attempts.length, chileDate(last.startedAt)],
      });
    }

    rows.sort((a, b) => b.streak - a.streak);

    return listResult({
      columns: [...BASE_COLUMNS, "Nivel máximo", "Partidas sin avanzar", "Partidas jugadas", "Última partida"],
      rows: rows.map((row) => row.cells),
      notes: [
        `Solo ${GAME_LABELS[game]}. El nivel máximo es el más alto ${game === "node-connection" ? "completado" : "aprobado"}, tomando todas sus partidas.`,
        `Se cuentan las últimas partidas seguidas que no superaron el mejor nivel que ya tenía; entran quienes llevan ${needed} o más. No se cuenta una partida que sigue en curso.`,
        "No distingue si el estudiante ya terminó todos los niveles del juego.",
      ],
      total: cohort.length,
    });
  },
};

// ------------------------------------------- partidas fallidas y abandonadas

const REPEAT_OPTION: ChartOptionDef = {
  id: "min",
  label: "Al menos",
  default: "2",
  choices: ["1", "2", "3", "4", "5"].map((value) => ({ value, label: value === "1" ? "1 partida" : `${value} partidas` })),
};

const genFailed: ChartDef = {
  id: "gen-failed",
  ...LIST_BASE,
  title: "Partidas fallidas repetidas",
  blurb:
    "Estudiantes que cierran partidas por fallar una y otra vez: se agotan los 3 intentos de un nivel y la partida termina. Sirve para saber a quién acompañar.",
  options: [REPEAT_OPTION, GAME_ANY],
  build: (ctx) => {
    const min = Number(ctx.options.min);
    const wanted = gameFilter(ctx);
    const attemptsBy = groupBy(ctx.data.attempts.filter(wanted), (attempt) => attempt.studentRut);
    const cohort = listCohort(ctx);
    const rows: { count: number; cells: (string | number | null)[] }[] = [];

    for (const student of cohort) {
      const attempts = attemptsBy.get(student.rut) ?? [];
      const failed = attempts.filter((attempt) => attempt.status === "failed");

      if (failed.length < min) continue;

      const last = failed.reduce((a, b) => (b.lastActivityAt > a.lastActivityAt ? b : a));

      rows.push({
        count: failed.length,
        cells: [...baseCells(student), failed.length, attempts.length, chileDate(last.lastActivityAt)],
      });
    }

    rows.sort((a, b) => b.count - a.count);

    return listResult({
      columns: [...BASE_COLUMNS, "Partidas fallidas", "Partidas jugadas", "Última fallida"],
      rows: rows.map((row) => row.cells),
      notes: [
        gameNote(ctx),
        "Fallida: se cerró tras agotar los 3 intentos de un nivel hasta el 10.",
        `Entran quienes tienen ${min === 1 ? "al menos 1 partida fallida" : `${min} o más partidas fallidas`}.`,
      ],
      total: cohort.length,
    });
  },
};

const genAbandoners: ChartDef = {
  id: "gen-abandoners",
  ...LIST_BASE,
  title: "Abandonan partidas a medias",
  blurb:
    "Estudiantes que dejan partidas sin terminar. Sirve para saber quién se está yendo en medio del juego, por cansancio, dificultad o problemas para conectarse.",
  options: [REPEAT_OPTION, GAME_ANY],
  build: (ctx) => {
    const min = Number(ctx.options.min);
    const wanted = gameFilter(ctx);
    const attemptsBy = groupBy(ctx.data.attempts.filter(wanted), (attempt) => attempt.studentRut);
    const cohort = listCohort(ctx);
    const rows: { count: number; cells: (string | number | null)[] }[] = [];

    for (const student of cohort) {
      const attempts = attemptsBy.get(student.rut) ?? [];
      const abandoned = attempts.filter((attempt) => isAbandoned(attempt, ctx.now));

      if (abandoned.length < min) continue;

      const last = abandoned.reduce((a, b) => (b.lastActivityAt > a.lastActivityAt ? b : a));

      rows.push({
        count: abandoned.length,
        cells: [
          ...baseCells(student),
          abandoned.length,
          attempts.length,
          Math.round((abandoned.length / attempts.length) * 100),
          chileDate(last.lastActivityAt),
        ],
      });
    }

    rows.sort((a, b) => b.count - a.count);

    return listResult({
      columns: [...BASE_COLUMNS, "Partidas abandonadas", "Partidas jugadas", "% abandonadas", "Última abandonada"],
      rows: rows.map((row) => row.cells),
      notes: [
        gameNote(ctx),
        "Abandonada: sin terminar y sin actividad hace más de 4 horas. Si el estudiante retoma la partida, deja de contarse.",
        `Entran quienes tienen ${min === 1 ? "al menos 1 partida abandonada" : `${min} o más partidas abandonadas`}.`,
      ],
      total: cohort.length,
    });
  },
};

// ------------------------------------------------- Mini casos sin desbloquear

export type MiniCasesProgress = {
  student: StudentRow;
  seriation: number;
  nodes: number;
  /** Cuantos niveles faltan en total para cumplir la regla (0 = ya la cumple). */
  missing: number;
  /** Lo que le falta, en palabras. */
  text: string;
};

/**
 * Cuanto le falta a cada estudiante para cumplir la regla de Mini casos:
 * aprobar el nivel 10 de Seriacion y completar el nivel 10 de Nodos.
 */
export function miniCasesProgress(students: StudentRow[], results: ResultRow[]): MiniCasesProgress[] {
  const seriation = new Map<string, number>();
  const nodes = new Map<string, number>();

  for (const result of results) {
    if (result.gameId === "color-sequence" && isColorSequenceResultPassed(result)) {
      seriation.set(result.studentRut, Math.max(seriation.get(result.studentRut) ?? 0, result.index));
    }

    if (result.gameId === "node-connection") {
      nodes.set(result.studentRut, Math.max(nodes.get(result.studentRut) ?? 0, result.index));
    }
  }

  return students.map((student) => {
    const cs = seriation.get(student.rut) ?? 0;
    const nc = nodes.get(student.rut) ?? 0;
    const csMissing = Math.max(0, MINI_CASES_UNLOCK_LEVEL - cs);
    const ncMissing = Math.max(0, MINI_CASES_UNLOCK_LEVEL - nc);
    const parts = [
      csMissing > 0 ? `Seriación: ${csMissing} ${csMissing === 1 ? "nivel" : "niveles"}` : null,
      ncMissing > 0 ? `Nodos: ${ncMissing} ${ncMissing === 1 ? "nivel" : "niveles"}` : null,
    ].filter((part): part is string => part !== null);

    return {
      student,
      seriation: cs,
      nodes: nc,
      missing: csMissing + ncMissing,
      text: parts.length === 0 ? "Ya cumple la regla: el desbloqueo se registra cuando entre a su panel" : `Le falta: ${parts.join(" · ")}`,
    };
  });
}

export const miniCasesColumns = [...BASE_COLUMNS, "Seriación (nivel aprobado)", "Nodos (nivel completado)", "Qué le falta"];

export const miniCasesCells = (item: MiniCasesProgress) => [
  ...baseCells(item.student),
  item.seriation,
  item.nodes,
  item.text,
];

/** Los que aun no tienen Mini casos desbloqueado, del que esta mas cerca al que esta mas lejos. */
export function lockedMiniCases(students: StudentRow[], results: ResultRow[], unlocks: UnlockRow[]): MiniCasesProgress[] {
  const unlocked = new Set(unlocks.filter((unlock) => unlock.gameId === "mini-cases").map((unlock) => unlock.studentRut));

  return miniCasesProgress(
    students.filter((student) => !unlocked.has(student.rut)),
    results,
  ).sort((a, b) => a.missing - b.missing || byName(a.student, b.student));
}

const NEAR_OPTION: ChartOptionDef = {
  id: "near",
  label: "Cuánto le falta",
  default: "all",
  choices: [
    { value: "all", label: "Cualquier cantidad" },
    { value: "5", label: "5 niveles o menos en total" },
    { value: "2", label: "2 niveles o menos en total" },
  ],
};

const genLocked: ChartDef = {
  id: "gen-locked",
  ...LIST_BASE,
  title: "Mini casos sin desbloquear",
  blurb:
    "Estudiantes que todavía no tienen Mini casos y lo que les falta para lograrlo. Parten por los que están más cerca. Sirve para saber a quién animar a terminar los niveles que le quedan.",
  options: [NEAR_OPTION],
  build: (ctx) => {
    const cohort = listCohort(ctx);
    const near = ctx.options.near === "all" ? Infinity : Number(ctx.options.near);
    const locked = lockedMiniCases(cohort, ctx.data.results, ctx.data.unlocks ?? []).filter((item) => item.missing <= near);

    return listResult({
      columns: miniCasesColumns,
      rows: locked.map(miniCasesCells),
      notes: [
        `Mini casos se desbloquea al aprobar el nivel ${MINI_CASES_UNLOCK_LEVEL} de Seriación de colores y completar el nivel ${MINI_CASES_UNLOCK_LEVEL} de Conexión de nodos, en partidas distintas o en la misma.`,
        "Quien ya cumple la regla pero no aparece desbloqueado se registra cuando entra a su panel.",
      ],
      total: cohort.length,
    });
  },
};

export const LIST_CHARTS: ChartDef[] = [genInactive, genStuck, genFailed, genAbandoners, genLocked];
