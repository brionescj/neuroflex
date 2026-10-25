import { ageAt } from "../gameAttempts";
import { buildStudentScores, type StudentScores } from "../studentScores";
import { fullName, shiftText, universityText } from "./chartsLists";
import type { AttemptRow, ResultRow, StudentRow } from "./types";

/**
 * El ranking de logros: los mismos puntos e insignias que ve cada estudiante en «Mis
 * puntuaciones» (lib/studentScores.ts), puestos en orden de mayor a menor para todo el grupo.
 * Nada depende del tiempo.
 */

export type RankedStudent = {
  student: StudentRow;
  scores: StudentScores;
  /** Insignias logradas. */
  earned: number;
  /** La insignia ganada de mayor dificultad (y, a igual nivel, la ultima de la lista). */
  bestBadge: string;
};

export const TOP_SCORE_COLUMNS = [
  "Puesto",
  "Estudiante",
  "RUT",
  "Universidad",
  "Paralelo",
  "Jornada",
  "Edad",
  "Puntos",
  "Rango",
  "Insignias",
  "Mejor insignia",
];

function bestBadgeOf(scores: StudentScores): string {
  const earned = scores.badges.filter((badge) => badge.earned);
  const top = earned.reduce<(typeof earned)[number] | null>(
    (best, badge) => (best === null || badge.tier >= best.tier ? badge : best),
    null,
  );

  return top ? `${top.name} (nivel ${top.tier})` : "";
}

const byName = (a: StudentRow, b: StudentRow) =>
  a.paternalLastName.localeCompare(b.paternalLastName, "es") || a.firstName.localeCompare(b.firstName, "es");

/**
 * Los estudiantes con al menos un punto, de mayor a menor puntaje. A igual puntaje decide quien
 * tiene mas insignias y, si aun empatan, el orden alfabetico. Quien no ha sumado puntos no aparece.
 */
export function rankStudents(input: {
  students: StudentRow[];
  attempts: AttemptRow[];
  results: ResultRow[];
  caseKeys: string[];
}): RankedStudent[] {
  const attemptsBy = new Map<string, AttemptRow[]>();
  const resultsBy = new Map<string, ResultRow[]>();

  const seenAttempts = new Set<string>();

  for (const attempt of input.attempts) {
    // Al comparar rangos de fechas la partida llega copiada: se cuenta una sola vez.
    if (seenAttempts.has(attempt.attemptId)) continue;

    seenAttempts.add(attempt.attemptId);

    const list = attemptsBy.get(attempt.studentRut) ?? [];

    list.push(attempt);
    attemptsBy.set(attempt.studentRut, list);
  }

  for (const result of input.results) {
    const list = resultsBy.get(result.studentRut) ?? [];

    list.push(result);
    resultsBy.set(result.studentRut, list);
  }

  const ranked: RankedStudent[] = [];

  for (const student of input.students) {
    const results = resultsBy.get(student.rut);

    if (!results || results.length === 0) continue;

    const scores = buildStudentScores({
      attempts: (attemptsBy.get(student.rut) ?? []).map((a) => ({
        attemptId: a.attemptId,
        gameId: a.gameId,
        attemptNumber: a.attemptNumber,
        status: a.status,
      })),
      results,
      caseKeys: input.caseKeys,
    });

    if (scores.totalPoints <= 0) continue;

    ranked.push({
      student,
      scores,
      earned: scores.badges.filter((badge) => badge.earned).length,
      bestBadge: bestBadgeOf(scores),
    });
  }

  return ranked.sort(
    (a, b) =>
      b.scores.totalPoints - a.scores.totalPoints || b.earned - a.earned || byName(a.student, b.student),
  );
}

/** Las filas de la tabla. Quienes empatan en puntos comparten puesto (1, 2, 2, 4). */
export function topScoreRows(ranked: RankedStudent[], now: Date): (string | number | null)[][] {
  let place = 0;

  return ranked.map((item, index) => {
    const previous = ranked[index - 1];

    if (!previous || previous.scores.totalPoints !== item.scores.totalPoints) place = index + 1;

    return [
      place,
      fullName(item.student),
      item.student.rut,
      universityText(item.student.university),
      item.student.paralelo ?? "",
      shiftText(item.student.studyShift),
      ageAt(item.student.birthDate, now),
      item.scores.totalPoints,
      item.scores.rank.name,
      `${item.earned} de ${item.scores.badges.length}`,
      item.bestBadge,
    ];
  });
}
