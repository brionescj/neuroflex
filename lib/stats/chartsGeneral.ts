import {
  AS_OPTION,
  COMPOSITION_VIEWS,
  FICHA_NOTE,
  GAME_OPTION,
  asOf,
  cohortOf,
  compositionSeries,
  countLabel,
  groupAttempts,
  isAbandoned,
  periodAttempts,
  periodNote,
  totalStudents,
  type ChartDef,
} from "./engine";
import { median, percentOf, round } from "./numbers";
import { isFirstTryTime, isLevelResultPassed } from "../gameAttempts";
import { chileWeekdayHour } from "./time";
import {
  GAME_IDS,
  GAME_LABELS,
  type AttemptRow,
  type ChartCards,
  type GameId,
  type ResultRow,
  type StudentRow,
} from "./types";
import { studentName } from "./pipeline";
import { rankStudents, topScoreRows, TOP_SCORE_COLUMNS } from "./topScores";
import { LIST_CHARTS, baseCells, chileDate, lockedMiniCases, miniCasesCells, miniCasesColumns } from "./chartsLists";

const PERIOD_ONLY = { usesPartida: false, usesPeriod: true } as const;

function gameNoteOf(game: string): string {
  return game === "all" ? "Se suman los tres juegos." : `Solo ${GAME_LABELS[game as GameId]}.`;
}

const number = (value: number, digits = 0) =>
  value.toLocaleString("es-CL", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// ------------------------------------------------------------------- G1

const genSummary: ChartDef = {
  id: "gen-summary",
  game: "general",
  title: "Resumen del grupo",
  blurb:
    "Un vistazo a cómo va el grupo: cuántos estudiantes habilitados hay, cuántos ya jugaron, cuántos desbloquearon Mini casos y cómo les va en Seriación y Nodos. Si lo comparas, cada grupo tiene sus propias tarjetas.",
  views: ["cards"],
  usesPartida: false,
  supportsDevice: false,
  options: [],
  build: (ctx) => {
    const grouped = cohortOf(ctx);
    const { attempts, results, unlocks = [] } = ctx.data;
    const resultsByRut = new Map<string, ResultRow[]>();

    for (const result of results) {
      const list = resultsByRut.get(result.studentRut) ?? [];

      list.push(result);
      resultsByRut.set(result.studentRut, list);
    }

    const playedGames = new Map<string, Set<GameId>>();

    for (const attempt of attempts) {
      const set = playedGames.get(attempt.studentRut) ?? new Set<GameId>();

      set.add(attempt.gameId);
      playedGames.set(attempt.studentRut, set);
    }

    const unlockedMini = new Set(
      unlocks.filter((u) => u.gameId === "mini-cases").map((u) => u.studentRut),
    );

    const rows: { label: string; values: (string | number | null)[]; hint: (i: number) => string | undefined }[] = [];
    const cards: ChartCards = [];
    const summaries = grouped.specs.map((spec) => {
      const students = grouped.byGroup.get(spec.key) ?? [];
      const played = students.filter((s) => (playedGames.get(s.rut)?.size ?? 0) > 0);
      const csPlayers = students.filter((s) => playedGames.get(s.rut)?.has("color-sequence"));
      const ncPlayers = students.filter((s) => playedGames.get(s.rut)?.has("node-connection"));

      const maxLevel = (rut: string, game: GameId) =>
        (resultsByRut.get(rut) ?? [])
          .filter((r) => r.gameId === game && isLevelResultPassed(r))
          .reduce((max, r) => Math.max(max, r.index), 0);

      const levelOf = (list: StudentRow[], game: GameId) => median(list.map((s) => maxLevel(s.rut, game)));
      const timeOf = (list: StudentRow[], game: GameId) =>
        median(
          list.flatMap((s) =>
            (resultsByRut.get(s.rut) ?? [])
              .filter((r) => r.gameId === game && isFirstTryTime(r))
              .map((r) => r.activeMsNet / 1000),
          ),
        );

      const unlockedAt = new Map(
        unlocks.filter((u) => u.gameId === "mini-cases").map((u) => [u.studentRut, u.unlockedAt] as const),
      );
      const sortByName = (a: StudentRow, b: StudentRow) =>
        a.paternalLastName.localeCompare(b.paternalLastName, "es") || a.firstName.localeCompare(b.firstName, "es");

      const ranking = rankStudents({
        students,
        attempts,
        results,
        caseKeys: ctx.data.caseKeys ?? [],
      });

      return {
        spec,
        ranking,
        rankingRows: topScoreRows(ranking, ctx.now),
        notPlayed: students.filter((s) => !played.includes(s)).sort(sortByName),
        locked: lockedMiniCases(students, ctx.data.results, unlocks),
        unlockedList: students.filter((s) => unlockedAt.has(s.rut)).sort(sortByName).map((s) => ({ student: s, at: unlockedAt.get(s.rut) as Date })),
        total: students.length,
        played: played.length,
        unlocked: students.filter((s) => unlockedMini.has(s.rut)).length,
        csLevel: levelOf(csPlayers, "color-sequence"),
        ncLevel: levelOf(ncPlayers, "node-connection"),
        csTime: timeOf(csPlayers, "color-sequence"),
        ncTime: timeOf(ncPlayers, "node-connection"),
        csCount: csPlayers.length,
        ncCount: ncPlayers.length,
      };
    });

    const spec = [
      {
        label: "Máximo logro",
        value: (s: (typeof summaries)[number]) => s.ranking[0]?.scores.totalPoints ?? null,
        text: (s: (typeof summaries)[number]) =>
          s.ranking[0] ? `${number(s.ranking[0].scores.totalPoints)} puntos` : "Sin datos",
        hint: (s: (typeof summaries)[number]) => {
          const top = s.ranking[0];

          return top ? `${studentName(top.student, top.student.rut)} · ${top.scores.rank.name} · ${top.earned} insignias` : undefined;
        },
        lists: (s: (typeof summaries)[number]) => [
          { title: "Ranking de logros", columns: TOP_SCORE_COLUMNS, rows: s.rankingRows },
        ],
      },
      {
        label: "Estudiantes habilitados",
        value: (s: (typeof summaries)[number]) => s.total,
        text: (s: (typeof summaries)[number]) => number(s.total),
        hint: () => undefined,
      },
      {
        label: "Han jugado al menos una vez",
        value: (s: (typeof summaries)[number]) => s.played,
        text: (s: (typeof summaries)[number]) => number(s.played),
        hint: (s: (typeof summaries)[number]) =>
          s.total === 0 ? undefined : `${number(percentOf(s.played, s.total) as number)} % de los habilitados`,
        lists: (s: (typeof summaries)[number]) => [
          {
            title: "Quiénes no han jugado",
            columns: ["Estudiante", "RUT", "Paralelo", "Universidad"],
            rows: s.notPlayed.map((student) => baseCells(student)),
          },
        ],
      },
      {
        label: "Con Mini casos desbloqueado",
        value: (s: (typeof summaries)[number]) => s.unlocked,
        text: (s: (typeof summaries)[number]) => number(s.unlocked),
        hint: (s: (typeof summaries)[number]) =>
          s.total === 0 ? undefined : `${number(percentOf(s.unlocked, s.total) as number)} % de los habilitados`,
        lists: (s: (typeof summaries)[number]) => [
          { title: "Quiénes no lo han desbloqueado", columns: miniCasesColumns, rows: s.locked.map(miniCasesCells) },
          {
            title: "Quiénes ya lo desbloquearon",
            columns: ["Estudiante", "RUT", "Paralelo", "Universidad", "Desbloqueado el"],
            rows: s.unlockedList.map(({ student, at }) => [...baseCells(student), chileDate(at)]),
          },
        ],
      },
      {
        label: "Nivel típico en Seriación (mediana)",
        value: (s: (typeof summaries)[number]) => round(s.csLevel),
        text: (s: (typeof summaries)[number]) => (s.csLevel === null ? "Sin datos" : number(s.csLevel, 1)),
        hint: (s: (typeof summaries)[number]) => (s.csCount === 0 ? undefined : `Entre ${s.csCount} estudiantes que jugaron`),
      },
      {
        label: "Nivel típico en Nodos (mediana)",
        value: (s: (typeof summaries)[number]) => round(s.ncLevel),
        text: (s: (typeof summaries)[number]) => (s.ncLevel === null ? "Sin datos" : number(s.ncLevel, 1)),
        hint: (s: (typeof summaries)[number]) => (s.ncCount === 0 ? undefined : `Entre ${s.ncCount} estudiantes que jugaron`),
      },
      {
        label: "Tiempo típico por nivel en Seriación (mediana)",
        value: (s: (typeof summaries)[number]) => round(s.csTime),
        text: (s: (typeof summaries)[number]) => (s.csTime === null ? "Sin datos" : `${number(s.csTime, 1)} s`),
        hint: () => "Primer intento de cada nivel",
      },
      {
        label: "Tiempo típico por nivel en Nodos (mediana)",
        value: (s: (typeof summaries)[number]) => round(s.ncTime),
        text: (s: (typeof summaries)[number]) => (s.ncTime === null ? "Sin datos" : `${number(s.ncTime, 1)} s`),
        hint: () => "Primer intento de cada nivel",
      },
    ];

    for (const item of spec) {
      rows.push({ label: item.label, values: summaries.map((s) => item.value(s)), hint: () => undefined });
    }

    for (const s of summaries) {
      cards.push({
        group: s.spec.label,
        slot: s.spec.slot,
        items: spec.map((item) => ({
          label: item.label,
          value: item.text(s),
          ...(item.hint(s) ? { hint: item.hint(s) as string } : {}),
          ...("lists" in item && item.lists ? { lists: item.lists(s) } : {}),
        })),
      });
    }

    return {
      xLabel: "",
      yLabel: "",
      unit: "students",
      unitLabel: "estudiantes",
      categories: [],
      series: [],
      cards,
      table: {
        columns: ["Indicador", ...summaries.map((s) => s.spec.label)],
        rows: rows.map((row) => [row.label, ...row.values]),
      },
      notes: [
        "Se cuentan los estudiantes habilitados. El nivel típico es el nivel máximo que alcanzó cada estudiante, tomando todas sus partidas; la mediana es el valor del medio.",
        "El máximo logro usa los mismos puntos e insignias de «Mis puntuaciones» del estudiante (no dependen del tiempo); el ranking ordena de mayor a menor puntaje y, si empatan, por insignias.",
        "El nivel de cada juego es el más alto que superó. En Nodos, superar un nivel es resolver el tablero sin agotar los errores permitidos; los niveles jugados antes de existir esos errores cuentan como superados.",
        FICHA_NOTE,
      ],
      studentsTotal: totalStudents(grouped, (s) => s.rut),
    };
  },
};

// ------------------------------------------------------------------- G4

const BUCKETS = [
  { label: "1 partida", test: (n: number) => n === 1 },
  { label: "2 a 5 partidas", test: (n: number) => n >= 2 && n <= 5 },
  { label: "6 a 10 partidas", test: (n: number) => n >= 6 && n <= 10 },
  { label: "11 o más partidas", test: (n: number) => n >= 11 },
];

const genPartidas: ChartDef = {
  id: "gen-partidas",
  game: "general",
  title: "Partidas por estudiante",
  blurb:
    "Cuántas veces ha jugado cada estudiante: una sola vez, de 2 a 5, de 6 a 10 o 11 o más. Sirve para ver si la plataforma se usa con constancia o solo se prueba una vez.",
  views: COMPOSITION_VIEWS,
  ...PERIOD_ONLY,
  supportsDevice: true,
  options: [GAME_OPTION, AS_OPTION],
  build: (ctx) => {
    const attempts = periodAttempts(ctx, ctx.options.game);
    const latest = new Map<string, AttemptRow>();
    const counts = new Map<string, number>();

    for (const attempt of attempts) {
      counts.set(attempt.studentRut, (counts.get(attempt.studentRut) ?? 0) + 1);

      const current = latest.get(attempt.studentRut);

      if (!current || attempt.startedAt > current.startedAt) latest.set(attempt.studentRut, attempt);
    }

    const grouped = groupAttempts(ctx, [...latest.values()]);
    const mode = asOf(ctx);

    return {
      xLabel: "Partidas jugadas por estudiante",
      yLabel: mode === "percent" ? "% de estudiantes" : "Estudiantes",
      unit: mode === "percent" ? "percent" : "students",
      unitLabel: "estudiantes",
      categories: BUCKETS.map((b) => b.label),
      series: compositionSeries(
        grouped,
        (attempt) => attempt.studentRut,
        BUCKETS.length,
        (items) =>
          BUCKETS.map(
            (bucket) => items.filter((a) => bucket.test(counts.get(a.studentRut) ?? 0)).length,
          ),
        mode,
      ),
      notes: [
        gameNoteOf(ctx.options.game as string),
        "Se cuentan las partidas iniciadas, terminadas o no. Quienes no tienen ninguna están en «Estudiantes sin partidas».",
        ...(periodNote(ctx) ? [periodNote(ctx) as string] : []),
      ],
      studentsTotal: totalStudents(grouped, (attempt) => attempt.studentRut),
    };
  },
};

// ------------------------------------------------------------------- G5

const OUTCOMES = ["Terminadas", "Fallidas", "Abandonadas", "En curso"];

const genOutcomes: ChartDef = {
  id: "gen-outcomes",
  game: "general",
  title: "Cómo terminan las partidas",
  blurb:
    "De todas las partidas, cuántas se terminaron, cuántas se cerraron por fallar, cuántas quedaron abandonadas y cuántas siguen en curso. Si muchas se abandonan, puede que el juego esté siendo muy largo o difícil.",
  views: COMPOSITION_VIEWS,
  ...PERIOD_ONLY,
  supportsDevice: true,
  options: [GAME_OPTION, AS_OPTION],
  build: (ctx) => {
    const attempts = periodAttempts(ctx, ctx.options.game);
    const grouped = groupAttempts(ctx, attempts);
    const mode = asOf(ctx);

    const slotOf = (attempt: AttemptRow) =>
      attempt.status === "finished"
        ? 0
        : attempt.status === "failed"
          ? 1
          : isAbandoned(attempt, ctx.now)
            ? 2
            : 3;

    return {
      xLabel: "Cómo terminó la partida",
      yLabel: mode === "percent" ? "% de partidas" : "Partidas",
      unit: mode === "percent" ? "percent" : "students",
      unitLabel: "partidas",
      categories: OUTCOMES,
      series: compositionSeries(
        grouped,
        (attempt) => attempt.studentRut,
        OUTCOMES.length,
        (items) => OUTCOMES.map((_, i) => items.filter((a) => slotOf(a) === i).length),
        mode,
      ),
      notes: [
        gameNoteOf(ctx.options.game as string),
        "Terminada: se completó (en Seriación, también si se cerró a propósito después del nivel 10). Fallida: se cerró tras agotar los 3 intentos de un nivel hasta el 10.",
        "Abandonada: sin terminar y sin actividad hace más de 4 horas. En curso: sin terminar pero con actividad reciente.",
        ...(periodNote(ctx) ? [periodNote(ctx) as string] : []),
      ],
      studentsTotal: totalStudents(grouped, (attempt) => attempt.studentRut),
    };
  },
};

// ------------------------------------------------------------------- G6

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HOURS = Array.from({ length: 24 }, (_, hour) => `${hour} h`);

const genWhen: ChartDef = {
  id: "gen-when",
  game: "general",
  title: "Día y hora de juego",
  blurb:
    "En qué días de la semana o a qué horas empiezan sus partidas. Sirve para saber cuándo conviene pedirles que jueguen o cuándo hay más gente conectada.",
  views: (options) => (options.by === "hour" ? ["bars", "lines"] : ["bars", "lines", "pie"]),
  ...PERIOD_ONLY,
  supportsDevice: true,
  options: [
    {
      id: "by",
      label: "Ver por",
      default: "weekday",
      choices: [
        { value: "weekday", label: "Día de la semana" },
        { value: "hour", label: "Hora del día" },
      ],
    },
    GAME_OPTION,
    AS_OPTION,
  ],
  build: (ctx) => {
    const attempts = periodAttempts(ctx, ctx.options.game);
    const grouped = groupAttempts(ctx, attempts);
    const byHour = ctx.options.by === "hour";
    const categories = byHour ? HOURS : WEEKDAYS;
    const mode = asOf(ctx);

    const slotOf = (attempt: AttemptRow) => {
      const { weekday, hour } = chileWeekdayHour(attempt.startedAt);

      return byHour ? hour : weekday;
    };

    return {
      xLabel: byHour ? "Hora de inicio" : "Día de inicio",
      yLabel: mode === "percent" ? "% de partidas" : "Partidas iniciadas",
      unit: mode === "percent" ? "percent" : "students",
      unitLabel: "partidas",
      categories,
      series: compositionSeries(
        grouped,
        (attempt) => attempt.studentRut,
        categories.length,
        (items) => categories.map((_, i) => items.filter((a) => slotOf(a) === i).length),
        mode,
      ),
      notes: [
        gameNoteOf(ctx.options.game as string),
        "Se cuenta cuándo empezó cada partida. Un estudiante con varias partidas aparece varias veces.",
        ...(periodNote(ctx) ? [periodNote(ctx) as string] : []),
      ],
      studentsTotal: totalStudents(grouped, (attempt) => attempt.studentRut),
    };
  },
};

// ------------------------------------------------------------------- G8

const genNoPlay: ChartDef = {
  id: "gen-no-play",
  game: "general",
  title: "Estudiantes sin partidas",
  blurb:
    "La lista de estudiantes habilitados que todavía no han jugado, en ningún juego o en uno en particular. Sirve para saber a quién recordarle que entre a la plataforma.",
  views: [],
  compare: false,
  usesPartida: false,
  supportsDevice: false,
  options: [
    {
      id: "game",
      label: "Sin partidas en",
      default: "all",
      choices: [
        { value: "all", label: "Ningún juego" },
        ...GAME_IDS.map((id) => ({ value: id, label: GAME_LABELS[id] })),
      ],
    },
  ],
  build: (ctx) => {
    const grouped = cohortOf(ctx);
    const game = ctx.options.game;
    const played = new Set(
      ctx.data.attempts
        .filter((attempt) => game === "all" || attempt.gameId === game)
        .map((attempt) => attempt.studentRut),
    );

    const missing = grouped.specs
      .flatMap((spec) => grouped.byGroup.get(spec.key) ?? [])
      .filter((student) => !played.has(student.rut))
      .sort(
        (a, b) =>
          a.paternalLastName.localeCompare(b.paternalLastName, "es") ||
          a.firstName.localeCompare(b.firstName, "es"),
      );

    const total = grouped.specs.reduce((sum, spec) => sum + (grouped.byGroup.get(spec.key)?.length ?? 0), 0);
    const university = (value: string | null | undefined) =>
      value === "santo-tomas" ? "Santo Tomás" : value === "uvm" ? "UVM" : "";
    const shift = (value: string | null | undefined) =>
      value === "day" ? "Diurna" : value === "evening" ? "Vespertina" : "";

    return {
      xLabel: "",
      yLabel: "",
      unit: "students",
      unitLabel: "estudiantes",
      categories: [],
      series: [],
      table: {
        columns: ["Estudiante", "RUT", "Paralelo", "Universidad", "Jornada", "Ciudad"],
        rows: missing.map((student) => [
          `${studentName(student, student.rut)}${student.maternalLastName ? ` ${student.maternalLastName}` : ""}`,
          student.rut,
          student.paralelo ?? "",
          university(student.university),
          shift(student.studyShift),
          student.ciudad ?? "",
        ]),
      },
      notes: [
        game === "all"
          ? "Sin ninguna partida en ningún juego."
          : `Sin ninguna partida en ${GAME_LABELS[game as GameId]}.`,
        missing.length === 0
          ? "Todos los estudiantes habilitados que cumplen los filtros ya jugaron."
          : `${countLabel("estudiantes")}: ${missing.length} de ${total} habilitados que cumplen los filtros.`,
      ],
      studentsTotal: missing.length,
    };
  },
};

export function chartsGeneral(
  participation: ChartDef,
  activity: ChartDef,
  abandonment: ChartDef,
): ChartDef[] {
  return [genSummary, participation, activity, genPartidas, genOutcomes, genWhen, abandonment, genNoPlay, ...LIST_CHARTS];
}
