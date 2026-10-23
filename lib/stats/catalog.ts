import { CHARTS } from "./charts";
import {
  DIMENSION_IDS,
  DIMENSION_LABELS,
  FILTER_CONTROL,
  FILTER_DIMENSIONS,
  filterOptions,
} from "./dimensions";
import { LOW_N, studentName } from "./pipeline";
import { MAX_AGE, MAX_COMPARED_STUDENTS, MIN_AGE } from "./request";
import { PERIOD_LABELS, PERIODS, chileDay } from "./time";
import {
  GAME_LABELS,
  STAT_GAMES,
  type ChartOptionDef,
  type DimensionId,
  type OptionChoice,
  type StatGame,
  type StudentRow,
} from "./types";

export type CatalogChart = {
  id: string;
  title: string;
  blurb: string;
  /** Indicador exploratorio: orienta, no concluye. */
  exploratory: boolean;
  /** Si se puede comparar por grupos. */
  canCompare: boolean;
  /** Si acepta el periodo (con o sin elegir partida). */
  usesPeriod: boolean;
  usesPartida: boolean;
  /** Si el grafico se puede separar y filtrar por dispositivo. */
  supportsDevice: boolean;
  options: ChartOptionDef[];
};

export type FilterSpec = {
  id: DimensionId;
  label: string;
  /** Botones (pocas opciones fijas) o lista desplegable (muchas). */
  control: "chips" | "select";
  options: OptionChoice[];
};

export type Catalog = {
  games: { id: StatGame; label: string; charts: CatalogChart[] }[];
  dimensions: { id: DimensionId; label: string }[];
  /** Solo los filtros con alguna opcion. El rango de edad va aparte (ageLimits). */
  filters: FilterSpec[];
  ageLimits: { min: number; max: number };
  partidas: OptionChoice[];
  /** Que se cuenta al mirar todas las partidas. */
  countBy: OptionChoice[];
  periods: OptionChoice[];
  students: { rut: string; name: string; paralelo: number | null }[];
  maxComparedStudents: number;
  lowN: number;
};

export function buildCatalog(
  students: StudentRow[],
  now: Date = new Date(),
): Catalog {
  const byName = new Map(students.map((student) => [student.rut, student]));
  const options = filterOptions(students, now, chileDay(now).year);

  return {
    games: STAT_GAMES.map((game) => ({
      id: game,
      label: game === "general" ? "General" : GAME_LABELS[game],
      charts: CHARTS.filter((chart) => chart.game === game).map((chart) => ({
        id: chart.id,
        title: chart.title,
        blurb: chart.blurb,
        exploratory: chart.exploratory ?? false,
        canCompare: chart.compare ?? true,
        usesPeriod: chart.usesPartida || (chart.usesPeriod ?? false),
        usesPartida: chart.usesPartida,
        supportsDevice: chart.supportsDevice,
        options: chart.options,
      })),
    })),
    dimensions: DIMENSION_IDS.map((id) => ({ id, label: DIMENSION_LABELS[id] })),
    filters: FILTER_DIMENSIONS.map((id) => ({
      id,
      label: DIMENSION_LABELS[id],
      control: FILTER_CONTROL[id] ?? "chips",
      options: options[id] ?? [],
    })).filter((spec) => spec.options.length > 0),
    ageLimits: { min: MIN_AGE, max: MAX_AGE },
    partidas: [
      { value: "first", label: "Primera partida de cada estudiante" },
      { value: "last", label: "Última partida de cada estudiante" },
      { value: "all", label: "Todas las partidas" },
    ],
    countBy: [
      { value: "students", label: "Estudiantes" },
      { value: "attempts", label: "Contar partidas" },
    ],
    periods: PERIODS.map((value) => ({ value, label: PERIOD_LABELS[value] })),
    students: [...students]
      .filter((student) => student.enabled !== false)
      .sort(
        (a, b) =>
          a.paternalLastName.localeCompare(b.paternalLastName, "es") ||
          a.firstName.localeCompare(b.firstName, "es"),
      )
      .map((student) => ({
        rut: student.rut,
        name: `${studentName(byName.get(student.rut), student.rut)}${
          student.maternalLastName ? ` ${student.maternalLastName}` : ""
        }`,
        paralelo: typeof student.paralelo === "number" ? student.paralelo : null,
      })),
    maxComparedStudents: MAX_COMPARED_STUDENTS,
    lowN: LOW_N,
  };
}
