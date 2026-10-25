import { isFirstTryTime } from "../gameAttempts";
import { buildChart } from "./charts";
import { chileDate, fullName, miniCasesProgress, shiftText, universityText } from "./chartsLists";
import { deductionOf } from "./deductions";
import { mean, median, round } from "./numbers";
import { DAY_MS, DECIMAL, SECONDS, emptyResult as empty, num } from "./profileCommon";
import { parseChartRequest } from "./request";
import { bestLevelOf as maxLevelOf, stateOf } from "./studentHistory";
import {
  GAME_LABELS,
  type AttemptRow,
  type AttemptState,
  type ChartCards,
  type ChartId,
  type ChartResult,
  type GameId,
  type ResultRow,
  type StatsData,
  type StudentProfile,
  type StudentProfileChart,
  type StudentRow,
} from "./types";

/**
 * La ficha de desempeno de un estudiante: su resumen, su historial de partidas
 * y los mismos graficos del catalogo pedidos solo para el. Los calculos son los
 * de siempre (se pide cada grafico comparando «estudiantes especificos» con uno
 * solo): asi sus numeros coinciden con los de la pantalla de estadisticas.
 */

/** Con menos companeros que esto en su paralelo se compara con todo el grupo. */
const MIN_PEERS = 3;

const GAMES: GameId[] = ["color-sequence", "node-connection", "mini-cases"];

/** Segundos del primer intento de cada nivel, de la lista de resultados (en Nodos, solo los que se pasaron). */
function firstTrySeconds(results: ResultRow[], game: GameId): number[] {
  return results.filter((r) => r.gameId === game && isFirstTryTime(r)).map((r) => r.activeMsNet / 1000);
}

const STATE_ORDER: AttemptState[] = ["finished", "failed", "open"];

const STATE_WORDS: Record<AttemptState, [string, string]> = {
  finished: ["terminada", "terminadas"],
  failed: ["fallida", "fallidas"],
  open: ["sin terminar", "sin terminar"],
};

/** Que partidas entran en los graficos de un juego, dicho en palabras («solo sus partidas terminadas»). */
type Scope = { singular: string; plural: string; used: string };

function scopeOf(states: AttemptState[]): Scope {
  const ordered = STATE_ORDER.filter((state) => states.includes(state));

  if (ordered.length === 0 || ordered.length === STATE_ORDER.length) {
    return { singular: "", plural: "", used: "todas sus partidas" };
  }

  const join = (i: 0 | 1) => ordered.map((state) => STATE_WORDS[state][i]).join(" y ");

  return { singular: join(0), plural: join(1), used: `solo sus partidas ${join(1)}` };
}

const partidasText = (count: number, scope: Scope) =>
  count === 1
    ? `su única partida${scope.singular ? ` ${scope.singular}` : ""}`
    : `sus ${count} partidas${scope.plural ? ` ${scope.plural}` : ""}`;

/** Cuantas partidas de un juego dejaron algun resultado guardado: las que de verdad entran en los graficos. */
function attemptsWithData(game: GameId, attempts: AttemptRow[], results: ResultRow[]): AttemptRow[] {
  return attempts
    .filter((a) => a.gameId === game && results.some((r) => r.attemptId === a.attemptId))
    .sort((a, b) => a.attemptNumber - b.attemptNumber);
}

/** Segundos del primer intento de cada nivel de una partida (mediana si un nivel aparece mas de una vez). */
function secondsByLevel(attempt: AttemptRow, results: ResultRow[]): Map<number, number> {
  const grouped = new Map<number, number[]>();

  for (const r of results) {
    if (r.attemptId !== attempt.attemptId || r.gameId !== attempt.gameId || !isFirstTryTime(r)) continue;

    grouped.set(r.index, [...(grouped.get(r.index) ?? []), r.activeMsNet / 1000]);
  }

  return new Map([...grouped].map(([level, seconds]) => [level, median(seconds) as number]));
}

/**
 * Su tiempo en cada nivel en la primera y en la ultima partida, solo en los niveles que jugo en las dos.
 * Comparar el «tiempo tipico» de cada partida mezclaba velocidad con cuanto avanzo: cada nivel pide mas
 * que el anterior, asi que una partida larga siempre salia mas lenta. Nivel a nivel si es comparable.
 */
function firstVsLast(game: GameId, attempts: AttemptRow[], results: ResultRow[], now: Date): StudentProfileChart | null {
  const withTimes = attemptsWithData(game, attempts, results).filter((a) => secondsByLevel(a, results).size > 0);

  if (withTimes.length < 2) return null;

  const first = withTimes[0] as AttemptRow;
  const last = withTimes[withTimes.length - 1] as AttemptRow;
  const before = secondsByLevel(first, results);
  const after = secondsByLevel(last, results);
  const levels = [...before.keys()].filter((level) => after.has(level)).sort((a, b) => a - b);

  if (levels.length === 0) return null;

  const title = "Tiempo por nivel: primera y última partida";

  return {
    id: "st-time",
    title,
    description:
      "Compara cuánto tardó en cada nivel entre su primera y su última partida, solo en los niveles que jugó en las dos. Si la línea de la última partida queda por debajo, ahora resuelve esos niveles más rápido. Es el tiempo del primer intento de cada nivel.",
    result: {
      ...empty("st-time", title, now),
      views: ["lines", "bars"],
      xLabel: "Nivel",
      yLabel: "Segundos (primer intento)",
      unit: "seconds",
      unitLabel: "segundos",
      basis: `Compara la partida ${first.attemptNumber} con la partida ${last.attemptNumber}, en los ${levels.length} niveles que jugó en ambas.`,
      categories: levels.map((level) => `Nivel ${level}`),
      series: [
        {
          key: "first",
          label: `Primera: partida ${first.attemptNumber}`,
          slot: 0,
          n: 1,
          values: levels.map((l) => round(before.get(l) as number, 1)),
          ns: levels.map(() => 1),
        },
        {
          key: "last",
          label: `Última: partida ${last.attemptNumber}`,
          slot: 1,
          n: 1,
          values: levels.map((l) => round(after.get(l) as number, 1)),
          ns: levels.map(() => 1),
        },
      ],
      deduction: deductionOf("st-time", true),
      notes: [
        "Es el tiempo activo del primer intento de cada nivel: solo cuenta mientras la pantalla estuvo visible y sin pausas largas.",
        "Solo se comparan los niveles que jugó en las dos partidas. Así la diferencia no depende de cuánto avanzó en cada una.",
      ],
    },
  };
}

/**
 * El nivel mas alto que logro en cada partida, en el orden en que las jugo. Se arma aqui y no con el
 * grafico del catalogo, que se corta en 20 partidas: en la ficha de un estudiante entran todas.
 */
function levelByAttempt(game: GameId, attempts: AttemptRow[], results: ResultRow[], now: Date, scope: Scope): StudentProfileChart | null {
  const ordered = attemptsWithData(game, attempts, results);

  if (ordered.length === 0) return null;

  const seriation = game === "color-sequence";
  const id: ChartId = seriation ? "cs-improvement" : "st-levels";
  const title = "Mejora entre partidas";
  const verb = "superó";
  const label = "Nivel más alto superado";
  const gameName = seriation ? "Seriación de colores" : "Conexión de nodos";

  return {
    id,
    title,
    description: `Cada punto es una partida, en el orden en que la jugó (1 = la primera). Su altura es el nivel más alto que ${verb} en esa partida: si la línea sube, llegó más lejos que antes.`,
    result: {
      ...empty(id, title, now),
      views: ["lines", "bars"],
      xLabel: "Partida (1 = la primera que jugó)",
      yLabel: label,
      unit: "level",
      unitLabel: "nivel",
      basis: `Calculado con ${partidasText(ordered.length, scope)}.`,
      deduction: deductionOf(id, true),
      categories: ordered.map((attempt) => String(attempt.attemptNumber)),
      series: [
        {
          key: "student",
          label,
          slot: 0,
          n: 1,
          values: ordered.map((attempt) => maxLevelOf(results.filter((r) => r.attemptId === attempt.attemptId), game)),
          ns: ordered.map(() => 1),
        },
      ],
      notes: [
        `Se usan ${scope.used} de ${gameName}.`,
        `Cada punto es una partida, en el orden en que la jugó. Su altura es el nivel más alto que ${verb} en esa partida.`,
      ],
    },
  };
}

/** Veces que empezo de nuevo (y corrigio con Deshacer) en cada nivel de Nodos. */
function nodeRestarts(attempts: AttemptRow[], results: ResultRow[], now: Date, scope: Scope): StudentProfileChart | null {
  const byLevel = new Map<number, { restarts: number; undo: number }>();

  for (const result of results.filter((r) => r.gameId === "node-connection")) {
    const current = byLevel.get(result.index) ?? { restarts: 0, undo: 0 };

    current.restarts += num(result.metrics.resetCount) + num(result.metrics.routeRestarts);
    current.undo += num(result.metrics.undoCount);
    byLevel.set(result.index, current);
  }

  if (byLevel.size === 0) return null;

  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const title = "Veces que empezó de nuevo por nivel";

  return {
    id: "st-restarts",
    title,
    description:
      "En cada nivel de Conexión de nodos, cuántas veces empezó de nuevo (reinició el nivel o rehízo una ruta ya dibujada) y cuántas veces corrigió con «Deshacer», que solo retrocede el último movimiento. Más barras en un nivel indican que le costó encontrar el camino. Suma todas sus partidas.",
    result: {
      ...empty("st-restarts", title, now),
      views: ["bars"],
      xLabel: "Nivel",
      yLabel: "Veces",
      unit: "count",
      unitLabel: "veces",
      basis: `Suma de ${partidasText(attemptsWithData("node-connection", attempts, results).length, scope)}.`,
      deduction: deductionOf("st-restarts", true),
      legendNote:
        "«Empezó de nuevo»: reinició el nivel o rehízo una ruta ya dibujada. «Corrigió con Deshacer»: deshizo solo el último movimiento.",
      categories: levels.map((level) => `Nivel ${level}`),
      series: [
        {
          key: "restarts",
          label: "Empezó de nuevo",
          slot: 0,
          n: 1,
          values: levels.map((l) => byLevel.get(l)?.restarts ?? 0),
          ns: levels.map(() => 1),
        },
        {
          key: "undo",
          label: "Corrigió con Deshacer",
          slot: 1,
          n: 1,
          values: levels.map((l) => byLevel.get(l)?.undo ?? 0),
          ns: levels.map(() => 1),
        },
      ],
      notes: [
        "«Empezó de nuevo» suma reiniciar el nivel completo y rehacer una ruta ya dibujada (empezar de nuevo desde un punto anterior).",
        "«Corrigió con Deshacer» cuenta las veces que usó el botón «Deshacer», que retrocede solo el último movimiento.",
        "El juego guarda el nivel cuando se completa: lo que hizo en un nivel que aún no completa no aparece.",
      ],
    },
  };
}

type SingleText = {
  description: string;
  xLabel?: string;
  yLabel?: string;
  /** Reemplaza las notas del grafico. */
  notes?: string[];
  /** Se agregan a las notas del grafico. */
  moreNotes?: string[];
  basis: string;
};

type Texts = {
  /** Partidas con resultados, por juego, que entran en los graficos. */
  counts: Record<GameId, number>;
  scopes: Record<GameId, Scope>;
};

/** Textos de cada grafico escritos para un solo estudiante: la descripcion habla de «el» y la base dice con cuantos datos se calculo. */
function singleTexts(id: ChartId, result: ChartResult, { counts, scopes }: Texts): SingleText | null {
  const counted = result.series.reduce((sum, series) => sum + series.ns.reduce((a, n) => a + n, 0), 0);
  const cs = partidasText(counts["color-sequence"], scopes["color-sequence"]);
  const mc = partidasText(counts["mini-cases"], scopes["mini-cases"]);
  const nc = partidasText(counts["node-connection"], scopes["node-connection"]);

  switch (id) {
    case "cs-time":
      return {
        description:
          "Cuánto tardó en responder cada nivel, contando solo el primer intento. Si jugó varias partidas, es la mediana de sus tiempos en ese nivel: el valor del medio, que unos pocos tiempos muy largos no distorsionan.",
        yLabel: "Segundos (mediana)",
        moreNotes: ["En cada nivel se toma la mediana de sus tiempos entre las partidas que lo jugaron."],
        basis: `Calculado con ${cs}, en el primer intento de cada nivel.`,
      };
    case "cs-tries":
      return {
        description:
          "Cada nivel da hasta 3 intentos. Aquí se ve en qué porcentaje de los niveles que jugó lo superó a la primera, al segundo o al tercer intento, y en cuántos no lo logró.",
        basis: `Calculado con ${counted} niveles jugados en ${cs}.`,
      };
    case "cs-error-type":
      return {
        description:
          "Cuando se equivocó, ¿cambió dos colores de lugar (intercambio) o puso un color que no correspondía (sustitución)? Ayuda a ver si el error viene del orden o de recordar los colores.",
        basis: `Calculado con ${counted} errores en ${cs}.`,
      };
    case "cs-first-error":
      return {
        description:
          "En las respuestas con error del primer intento, en qué parte de la secuencia ocurrió el primer fallo: al comienzo, en la parte central o al final. Por ejemplo, en una secuencia de 9 colores el comienzo son los colores 1 a 3, la parte central del 4 al 6 y el final del 7 al 9. Un fallo temprano suele hablar de no haber retenido el comienzo; uno tardío, de perder el hilo.",
        basis: `Calculado con ${counted} respuestas con error en ${cs}.`,
      };
    case "nc-time":
      return {
        description:
          "Cuánto tardó en completar cada nivel de Conexión de nodos. Si jugó varias partidas, es la mediana de sus tiempos en ese nivel: el valor del medio, que unos pocos tiempos muy largos no distorsionan.",
        yLabel: "Segundos (mediana)",
        moreNotes: ["En cada nivel se toma la mediana de sus tiempos entre las partidas que lo completaron."],
        basis: `Calculado con ${nc}.`,
      };
    case "mc-steps":
      return {
        description:
          "En cada mini caso hay que ordenar 4 pasos. Cada barra es el promedio de pasos que puso en su lugar correcto (de 0 a 4) en ese caso, entre las partidas que jugó.",
        yLabel: "Pasos correctos (promedio)",
        moreNotes: ["Si jugó el caso en varias partidas, se promedian sus resultados; con una sola partida es ese mismo resultado."],
        basis: `Promedio de ${mc} de Mini casos.`,
      };
    case "mc-time":
      return {
        description:
          "Cuánto tardó en decidir el orden de los 4 pasos de cada caso, sin contar pausas largas de inactividad. Si jugó el caso en varias partidas, es la mediana de sus tiempos.",
        yLabel: "Segundos (mediana)",
        moreNotes: ["Si jugó el caso en varias partidas, se toma la mediana de sus tiempos; con una sola es ese mismo tiempo."],
        basis: `Mediana de ${mc} de Mini casos.`,
      };
    default:
      return null;
  }
}

/** La nota que dice que entra en el grafico: de las partidas elegidas, solo las que guardaron algo se pueden graficar. */
function coverageNote(selected: number, withData: number, scope: Scope): string {
  const one = scope.singular === "" ? "partida" : `partida ${scope.singular}`;
  const many = scope.plural === "" ? "partidas" : `partidas ${scope.plural}`;

  if (selected === 0) return `No tiene ${many}.`;

  if (selected === withData) {
    return selected === 1
      ? `Entra su única ${one}, con resultados guardados.`
      : `Entran sus ${selected} ${many}, todas con resultados guardados.`;
  }

  const without = selected - withData;

  return `Entran ${withData} de sus ${selected} ${many}: ${without} ${without === 1 ? "no guardó" : "no guardaron"} ningún nivel o caso, así que no tienen nada que graficar.`;
}

/** Pide un grafico del catalogo solo para este estudiante; null si no se puede o no tiene datos. */
function catalogChart(
  id: ChartId,
  rut: string,
  data: StatsData,
  now: Date,
  texts: Texts,
  game: GameId,
  coverage: string,
): StudentProfileChart | null {
  const parsed = parseChartRequest({ chart: id, groupBy: "student", students: JSON.stringify([rut]) });

  if (!parsed.ok) return null;

  const result = buildChart(parsed.def, parsed.request, data, now);

  // Un grafico sin ningun dato (el estudiante no tiene nada que mostrar ahi) no se muestra.
  const hasData = result.series.some((series) => series.ns.some((n) => n > 0));

  if (!hasData && !result.table && !result.cards) return null;

  const text = singleTexts(id, result, texts);
  const scope = texts.scopes[game];

  // Las notas del grupo no valen para un estudiante: no se habla de «habilitados» y las partidas usadas son las elegidas.
  const baseNotes = result.notes
    .filter((note) => !/habilitad/i.test(note))
    .map((note) => (note === "Se usan todas las partidas del estudiante." ? `Se usan ${scope.used}.` : note));

  const withCoverage = (notes: string[]) => [...notes, coverage];
  const deduction = deductionOf(id, true);

  if (!text) {
    return {
      id,
      title: result.title,
      description: parsed.def.blurb,
      result: { ...result, notes: withCoverage(baseNotes), ...(deduction ? { deduction } : {}) },
    };
  }

  return {
    id,
    title: result.title,
    description: text.description,
    result: {
      ...result,
      ...(text.xLabel ? { xLabel: text.xLabel } : {}),
      ...(text.yLabel ? { yLabel: text.yLabel } : {}),
      notes: withCoverage(text.notes ?? [...baseNotes, ...(text.moreNotes ?? [])]),
      basis: text.basis,
      ...(deduction ? { deduction } : {}),
    },
  };
}

type Stat = { mean: number | null; median: number | null };

const statOf = (values: number[]): Stat => ({ mean: mean(values), median: median(values) });

type Comparison = {
  /** «Su paralelo» o «Todo el grupo», con cuantos estudiantes son. */
  label: string;
  level: Record<GameId, Stat>;
  seconds: Record<GameId, Stat>;
};

const NO_STAT: Stat = { mean: null, median: null };

/**
 * Con quien se compara el resumen: su paralelo si hay suficientes companeros, o todo el grupo.
 * Es lo unico de «Desempeño» que mira a otros estudiantes. Cuentan los habilitados, sin el.
 */
function comparisonOf(student: StudentRow, data: StatsData): Comparison {
  const others = data.students.filter((s) => s.enabled !== false && s.rut !== student.rut);
  const peers = student.paralelo == null ? [] : others.filter((s) => s.paralelo === student.paralelo);
  const useParalelo = peers.length >= MIN_PEERS;
  const group = useParalelo ? peers : others;
  const label = `${useParalelo ? "Su paralelo" : "Todo el grupo"} (${group.length} ${group.length === 1 ? "estudiante" : "estudiantes"})`;

  const ruts = new Set(group.map((s) => s.rut));
  const resultsOf = (game: GameId) => data.results.filter((r) => ruts.has(r.studentRut) && r.gameId === game);
  const players = (game: GameId) =>
    new Set(data.attempts.filter((a) => a.gameId === game && ruts.has(a.studentRut)).map((a) => a.studentRut));

  // Nivel: el mejor de cada estudiante que jugo el juego.
  const levelOf = (game: GameId): Stat => {
    const results = resultsOf(game);

    return statOf([...players(game)].map((rut) => maxLevelOf(results.filter((r) => r.studentRut === rut), game)));
  };

  // Tiempo: todos los primeros intentos de sus niveles.
  const timeOf = (game: GameId): Stat => statOf(firstTrySeconds(resultsOf(game), game));

  return {
    label,
    level: { "color-sequence": levelOf("color-sequence"), "node-connection": levelOf("node-connection"), "mini-cases": NO_STAT },
    seconds: { "color-sequence": timeOf("color-sequence"), "node-connection": timeOf("node-connection"), "mini-cases": NO_STAT },
  };
}

export type StatesQueryResult = { ok: true; states: NonNullable<ProfileOptions["states"]> } | { ok: false; message: string };

/** Lee los estados elegidos por juego: `?color-sequence=finished,failed`; lo que no se indica, entra completo. */
export function parseStatesQuery(raw: Record<string, unknown>): StatesQueryResult {
  const states: NonNullable<ProfileOptions["states"]> = {};

  for (const game of GAMES) {
    const value = raw[game];

    if (value === undefined || value === "") continue;

    if (typeof value !== "string") return { ok: false, message: "Los estados pedidos no son válidos." };

    const parts = value.split(",");

    if (!parts.every((part): part is AttemptState => STATE_ORDER.includes(part as AttemptState))) {
      return { ok: false, message: "Los estados pedidos no son válidos." };
    }

    states[game] = parts;
  }

  return { ok: true, states };
}

export type ProfileOptions = {
  /** Que partidas entran en los graficos de cada juego; sin indicar, todas. */
  states?: Partial<Record<GameId, AttemptState[]>>;
};

export function buildStudentProfile(
  rut: string,
  data: StatsData,
  now: Date = new Date(),
  options: ProfileOptions = {},
): StudentProfile | null {
  const student = data.students.find((s) => s.rut === rut);

  if (!student) return null;

  const attempts = data.attempts.filter((a) => a.studentRut === rut);
  const results = data.results.filter((r) => r.studentRut === rut);
  const comparison = comparisonOf(student, data);

  // --------------------------------------------------------------- tarjetas
  // El resumen siempre cuenta todas sus partidas: el filtro por estado es de los graficos.
  const played = (game: GameId) => attempts.filter((a) => a.gameId === game);
  const countState = (state: AttemptState) => attempts.filter((a) => stateOf(a) === state);
  const byGame = (list: AttemptRow[]) =>
    GAMES.map((game) => `${GAME_LABELS[game]} ${list.filter((a) => a.gameId === game).length}`).join(" · ");
  const first = attempts.length === 0 ? null : attempts.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
  const last = attempts.length === 0 ? null : attempts.reduce((a, b) => (b.lastActivityAt > a.lastActivityAt ? b : a));
  const idleDays = last === null ? null : Math.floor((now.getTime() - last.lastActivityAt.getTime()) / DAY_MS);
  const unlock = (data.unlocks ?? []).find((u) => u.studentRut === rut && u.gameId === "mini-cases");
  const progress = miniCasesProgress([student], results)[0];

  const versus = (stat: Stat, show: (value: number | null) => string) =>
    stat.mean === null ? null : `${comparison.label}: promedio ${show(stat.mean)} · mediana ${show(stat.median)}`;

  const levelCard = (game: GameId, label: string) => {
    const mine = played(game).length > 0 ? maxLevelOf(results, game) : null;
    const perPartida = statOf(
      attemptsWithData(game, played(game), results).map((a) =>
        maxLevelOf(results.filter((r) => r.attemptId === a.attemptId), game),
      ),
    );
    const lines = [
      perPartida.mean === null ? null : `Por partida: promedio ${DECIMAL(perPartida.mean)} · mediana ${DECIMAL(perPartida.median)}`,
      versus(comparison.level[game], (value) => DECIMAL(value)),
    ].filter((line): line is string => line !== null);

    return {
      label: `Nivel máximo en ${label}`,
      value: mine === null ? "Sin partidas" : String(mine),
      ...(lines.length === 0 ? {} : { hint: lines.join("\n") }),
    };
  };

  const timeCard = (game: GameId, label: string) => {
    const mine = statOf(firstTrySeconds(results, game));
    const lines = [
      mine.mean === null ? null : `Mediana: ${SECONDS(mine.median)}`,
      versus(comparison.seconds[game], (value) => SECONDS(value)),
    ].filter((line): line is string => line !== null);

    return {
      label: `Tiempo por nivel en ${label} (promedio)`,
      value: SECONDS(mine.mean),
      ...(lines.length === 0 ? {} : { hint: lines.join("\n") }),
    };
  };

  const cards: ChartCards = [
    {
      group: "Resumen",
      slot: 0,
      items: [
        { label: "Partidas jugadas", value: String(attempts.length), hint: byGame(attempts) },
        { label: "Terminadas", value: String(countState("finished").length), hint: byGame(countState("finished")) },
        { label: "Fallidas", value: String(countState("failed").length), hint: byGame(countState("failed")) },
        { label: "Sin terminar", value: String(countState("open").length), hint: byGame(countState("open")) },
        { label: "Primera partida", value: first ? chileDate(first.startedAt) : "Sin partidas" },
        {
          label: "Última actividad",
          value: last ? chileDate(last.lastActivityAt) : "Sin partidas",
          ...(idleDays === null ? {} : { hint: idleDays === 0 ? "Hoy" : `Hace ${idleDays} ${idleDays === 1 ? "día" : "días"}` }),
        },
        {
          label: "Mini casos",
          value: unlock ? "Desbloqueado" : "Sin desbloquear",
          hint: unlock ? `El ${chileDate(unlock.unlockedAt)}` : progress?.text,
        },
        levelCard("color-sequence", "Seriación"),
        levelCard("node-connection", "Nodos"),
        timeCard("color-sequence", "Seriación"),
        timeCard("node-connection", "Nodos"),
      ],
    },
  ];

  // --------------------------------------------------------- graficos por juego
  const picked = Object.fromEntries(
    GAMES.map((game) => {
      const asked = options.states?.[game];

      return [game, asked && asked.length > 0 ? STATE_ORDER.filter((state) => asked.includes(state)) : STATE_ORDER];
    }),
  ) as Record<GameId, AttemptState[]>;
  const scopes = Object.fromEntries(GAMES.map((game) => [game, scopeOf(picked[game])])) as Record<GameId, Scope>;

  const selectedOf = (game: GameId) => played(game).filter((a) => picked[game].includes(stateOf(a)));
  const resultsOfSelected = (game: GameId) => {
    const ids = new Set(selectedOf(game).map((a) => a.attemptId));

    return results.filter((r) => r.gameId === game && ids.has(r.attemptId));
  };
  const withData = (game: GameId) => attemptsWithData(game, selectedOf(game), resultsOfSelected(game)).length;

  const texts: Texts = {
    counts: Object.fromEntries(GAMES.map((game) => [game, withData(game)])) as Record<GameId, number>,
    scopes,
  };

  const games = GAMES.map((game) => {
    const mine = played(game);
    const selected = selectedOf(game);
    const gameResults = resultsOfSelected(game);
    const charts: StudentProfileChart[] = [];

    // Los graficos se calculan con los datos de este estudiante solo, aunque este inhabilitado:
    // el admin lo pidio por nombre.
    const chartData: StatsData = {
      ...data,
      students: [{ ...student, enabled: true }],
      attempts: selected,
      results: gameResults,
    };
    const coverage = coverageNote(selected.length, texts.counts[game], scopes[game]);

    if (texts.counts[game] > 0) {
      const pick = (id: ChartId) => {
        const chart = catalogChart(id, rut, chartData, now, texts, game, coverage);

        if (chart) charts.push(chart);
      };
      const add = (chart: StudentProfileChart | null) => {
        if (!chart) return;

        charts.push({ ...chart, result: { ...chart.result, notes: [...chart.result.notes, coverage] } });
      };

      if (game === "color-sequence") {
        add(levelByAttempt(game, selected, gameResults, now, scopes[game]));
        pick("cs-time");
        add(firstVsLast(game, selected, gameResults, now));
        pick("cs-tries");
        pick("cs-error-type");
        pick("cs-first-error");
      } else if (game === "node-connection") {
        add(levelByAttempt(game, selected, gameResults, now, scopes[game]));
        pick("nc-time");
        add(firstVsLast(game, selected, gameResults, now));
        add(nodeRestarts(selected, gameResults, now, scopes[game]));
      } else {
        pick("mc-steps");
        pick("mc-time");
      }
    }

    return {
      game,
      label: GAME_LABELS[game],
      played: mine.length > 0,
      attempts: mine.length,
      breakdown: {
        total: mine.length,
        finished: mine.filter((a) => stateOf(a) === "finished").length,
        failed: mine.filter((a) => stateOf(a) === "failed").length,
        open: mine.filter((a) => stateOf(a) === "open").length,
        states: picked[game],
        selected: selected.length,
        withData: texts.counts[game],
      },
      charts,
    };
  });

  const compared = [comparison.level, comparison.seconds].some((by) => GAMES.some((game) => by[game].mean !== null));

  return {
    student: {
      rut: student.rut,
      name: fullName(student),
      paralelo: student.paralelo ?? null,
      university: universityText(student.university),
      shift: shiftText(student.studyShift),
      ciudad: student.ciudad ?? "",
      enabled: student.enabled !== false,
    },
    cards,
    games,
    // Explica las tarjetas del resumen: se muestra al pie de esa tarjeta.
    notes: [
      "Las cifras del estudiante salen solo de su propio historial, con todas sus partidas: terminadas, fallidas y sin terminar.",
      ...(compared
        ? [
            `La línea «${comparison.label}» es la única comparación con otros estudiantes de «Desempeño»: promedio y mediana de quienes jugaron ese juego, sin contar a este estudiante. En el nivel máximo se toma el mejor nivel de cada uno; en el tiempo, todos los primeros intentos de sus niveles. Con menos de ${MIN_PEERS} compañeros de paralelo se compara con todo el grupo.`,
          ]
        : []),
      "Promedio: la suma de los valores dividida por su cantidad. Mediana: el valor del medio; un tiempo muy largo la afecta menos que al promedio.",
      "«Sin terminar» son partidas que quedaron abiertas: si el estudiante vuelve, retoma la misma partida.",
    ],
    generatedAt: now.toISOString(),
  };
}
