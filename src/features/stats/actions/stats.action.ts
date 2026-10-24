import {
  getStatsCatalog,
  getStatsChart,
  getStudentEvolution,
  getStudentHistory,
  getStudentProfile,
  type StatesByGame,
} from "../services/stats.service";
import type { EvolutionBy, EvolutionSpan } from "../types";

export async function getStatsCatalogAction() {
  return getStatsCatalog();
}

export async function getStatsChartAction(params: Record<string, string>) {
  return getStatsChart(params);
}

export async function getStudentProfileAction(rut: string, states?: StatesByGame) {
  return getStudentProfile(rut, states);
}

export async function getStudentHistoryAction(rut: string, query: { page: number; from: string; to: string }) {
  return getStudentHistory(rut, query);
}

export async function getStudentEvolutionAction(rut: string, by: EvolutionBy, span: EvolutionSpan) {
  return getStudentEvolution(rut, by, span);
}
