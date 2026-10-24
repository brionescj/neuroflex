import { getStatsCatalog, getStatsChart, getStudentProfile } from "../services/stats.service";

export async function getStatsCatalogAction() {
  return getStatsCatalog();
}

export async function getStatsChartAction(params: Record<string, string>) {
  return getStatsChart(params);
}

export async function getStudentProfileAction(rut: string) {
  return getStudentProfile(rut);
}
