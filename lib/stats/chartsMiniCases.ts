import { BASE_COLUMNS, baseCells } from "./chartsLists";
import {
  caseCategories,
  contextNotes,
  gameUnits,
  groupUnits,
  ownResults,
  unitRut,
  type ChartDef,
} from "./engine";
import { percentOf } from "./numbers";
import { studentName } from "./pipeline";
import type { ChartCards, ResultRow, StudentRow } from "./types";

/**
 * «Alternativas que más fallan»: por cada mini caso, cual de sus 4 pasos se
 * ubica mal con mas frecuencia, en que lugar lo ponen y quienes lo fallan.
 */

type Placement = { optionKey: string; step: number; expectedStep: number };

type OptionStats = {
  optionKey: string;
  text: string;
  /** Veces que se jugo el caso con esta alternativa (una por partida). */
  plays: number;
  wrong: number;
  /** Lugar (1 a 4) en que la pusieron cuando la ubicaron mal, y cuantas veces. */
  placedAt: Map<number, number>;
  expectedAt: Map<number, number>;
  /** Por estudiante: veces jugada y veces que la fallo, y donde la puso. */
  byStudent: Map<string, { plays: number; wrong: number; placedAt: Map<number, number> }>;
};

const asNumber = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

function readPlacements(result: ResultRow): Placement[] | null {
  const raw = result.metrics.placements;

  if (!Array.isArray(raw)) return null;

  const placements: Placement[] = [];

  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;

    const { optionKey, step, expectedStep } = item as Record<string, unknown>;
    const stepNumber = asNumber(step);
    const expectedNumber = asNumber(expectedStep);

    if (typeof optionKey !== "string" || stepNumber === null || expectedNumber === null) return null;

    placements.push({ optionKey, step: stepNumber, expectedStep: expectedNumber });
  }

  return placements.length > 0 ? placements : null;
}

function readTexts(result: ResultRow): Map<string, string> {
  const texts = new Map<string, string>();
  const raw = result.metrics.options;

  if (!Array.isArray(raw)) return texts;

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;

    const { optionKey, text } = item as Record<string, unknown>;

    if (typeof optionKey === "string" && typeof text === "string") texts.set(optionKey, text);
  }

  return texts;
}

/** El valor mas repetido; con empate, el menor. */
function topOf(counts: Map<number, number>): { value: number; times: number } | null {
  let best: { value: number; times: number } | null = null;

  for (const [value, times] of counts) {
    if (!best || times > best.times || (times === best.times && value < best.value)) best = { value, times };
  }

  return best;
}

const bump = (counts: Map<number, number>, key: number) => counts.set(key, (counts.get(key) ?? 0) + 1);

const stepText = (step: number | null) => (step === null ? "" : `Paso ${step}`);

function placeText(counts: Map<number, number>, of: number): string {
  const top = topOf(counts);

  return top ? `${stepText(top.value)} (${top.times} de ${of})` : "";
}

export const mcOptions: ChartDef = {
  id: "mc-options",
  game: "mini-cases",
  title: "Alternativas que más fallan",
  blurb:
    "En cada mini caso hay 4 pasos que ordenar. Para cada caso muestra qué paso se ubica mal con más frecuencia, en qué lugar suelen ponerlo y qué estudiantes lo fallaron. Toca un paso para ver a esos estudiantes; la vista «Tabla» junta todos los casos.",
  views: ["cards"],
  compare: false,
  exploratory: true,
  usesPartida: true,
  supportsDevice: true,
  options: [],
  build: (ctx) => {
    const units = gameUnits(ctx, "mini-cases");
    const grouped = groupUnits(ctx, units);
    const items = grouped.specs.flatMap((spec) => grouped.byGroup.get(spec.key) ?? []);
    const { keys, labels } = caseCategories(ctx, units);

    const cards: ChartCards = [];
    const tableRows: (string | number | null)[][] = [];
    const students = new Set<string>();
    let withoutDetail = 0;

    keys.forEach((caseKey, caseIndex) => {
      const options = new Map<string, OptionStats>();

      for (const unit of items) {
        for (const result of ownResults(unit, (r) => r.key === caseKey)) {
          const placements = readPlacements(result);

          if (!placements) {
            withoutDetail += 1;
            continue;
          }

          const texts = readTexts(result);
          const rut = unitRut(unit);

          students.add(rut);

          for (const placement of placements) {
            const stats =
              options.get(placement.optionKey) ??
              ({
                optionKey: placement.optionKey,
                text: texts.get(placement.optionKey) ?? placement.optionKey,
                plays: 0,
                wrong: 0,
                placedAt: new Map(),
                expectedAt: new Map(),
                byStudent: new Map(),
              } satisfies OptionStats);
            const own = stats.byStudent.get(rut) ?? { plays: 0, wrong: 0, placedAt: new Map<number, number>() };

            if (texts.has(placement.optionKey)) stats.text = texts.get(placement.optionKey) as string;

            stats.plays += 1;
            own.plays += 1;
            bump(stats.expectedAt, placement.expectedStep);

            if (placement.step !== placement.expectedStep) {
              stats.wrong += 1;
              own.wrong += 1;
              bump(stats.placedAt, placement.step);
              bump(own.placedAt, placement.step);
            }

            stats.byStudent.set(rut, own);
            options.set(placement.optionKey, stats);
          }
        }
      }

      if (options.size === 0) return;

      const ordered = [...options.values()].sort(
        (a, b) =>
          b.wrong / b.plays - a.wrong / a.plays ||
          (topOf(a.expectedAt)?.value ?? 0) - (topOf(b.expectedAt)?.value ?? 0),
      );
      const label = labels[caseIndex] as string;

      cards.push({
        group: label,
        slot: caseIndex % 8,
        items: ordered.map((stats) => {
          const expected = topOf(stats.expectedAt)?.value ?? null;
          const percent = Math.round(percentOf(stats.wrong, stats.plays));
          const failing = [...stats.byStudent.entries()]
            .filter(([, own]) => own.wrong > 0)
            .sort((a, b) => b[1].wrong - a[1].wrong || a[0].localeCompare(b[0]));

          tableRows.push([
            label,
            stats.text,
            stepText(expected),
            stats.plays,
            percent,
            stats.wrong === 0 ? "—" : placeText(stats.placedAt, stats.wrong),
            failing.length,
          ]);

          return {
            label: stats.text,
            value: stats.wrong === 0 ? "Nadie la ubicó mal" : `${percent} % la ubicó mal`,
            hint:
              stats.wrong === 0
                ? `Debía ir en el ${stepText(expected).toLowerCase()}. Se jugó ${stats.plays} ${stats.plays === 1 ? "vez" : "veces"}.`
                : `Debía ir en el ${stepText(expected).toLowerCase()}; la suelen poner en el ${placeText(stats.placedAt, stats.wrong).toLowerCase()} veces que falló. ${failing.length} ${failing.length === 1 ? "estudiante la falló" : "estudiantes la fallaron"}.`,
            lists:
              failing.length === 0
                ? []
                : [
                    {
                      title: "Estudiantes que la ubicaron mal",
                      columns: [...BASE_COLUMNS, "Veces que falló", "Veces que la jugó", "Dónde la puso más"],
                      rows: failing.map(([rut, own]) => {
                        const student: StudentRow | undefined = ctx.students.get(rut);

                        return [
                          ...(student ? baseCells(student) : [studentName(undefined, rut), rut, "", ""]),
                          own.wrong,
                          own.plays,
                          placeText(own.placedAt, own.wrong),
                        ];
                      }),
                    },
                  ],
          };
        }),
      });
    });

    return {
      xLabel: "",
      yLabel: "",
      unit: "students",
      unitLabel: "estudiantes",
      categories: [],
      series: [],
      cards,
      table: {
        columns: [
          "Caso",
          "Paso",
          "Lugar correcto",
          "Veces que se jugó",
          "% ubicado mal",
          "Dónde lo ponen más",
          "Estudiantes que lo fallaron",
        ],
        rows: tableRows,
      },
      notes: [
        ...contextNotes(ctx),
        "Cada paso se cuenta una vez por partida en que se jugó el caso. «Ubicado mal» es ponerlo en un lugar distinto al que le corresponde; si el caso tiene más de un orden válido, se usa el que más se parece al respondido.",
        "«Dónde lo ponen más» es el lugar más repetido solo entre las veces que se ubicó mal; entre paréntesis, cuántas veces de las que falló.",
        "Un paso que muchos ubican mal en el mismo lugar sugiere una confusión común sobre el orden de esa acción: puede servir para reforzarla al enseñar la secuencia.",
        ...(withoutDetail > 0
          ? [`${withoutDetail} respuestas antiguas no guardaron en qué lugar puso cada paso y no entran aquí.`]
          : []),
        "Indicador exploratorio: con pocas partidas un porcentaje alto puede ser casualidad; mira siempre cuántas veces se jugó.",
      ],
      studentsTotal: students.size,
    };
  },
};
