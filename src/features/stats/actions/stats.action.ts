import { getStatsCatalog, getStatsChart } from "../services/stats.service";

export async function getStatsCatalogAction() {
  return getStatsCatalog();
}

export async function getStatsChartAction(params: Record<string, string>) {
  return getStatsChart(params);
}
