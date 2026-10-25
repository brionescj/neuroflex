import type { ChartResult, ViewId } from "../../types";
import { BarChart } from "./BarChart";
import { CategoryLegend } from "./CategoryLegend";
import { LineChart } from "./LineChart";
import { PieChart } from "./PieChart";
import { StackedChart } from "./StackedChart";
import { StatCards } from "./StatCards";

/** El dibujo de un grafico en la forma elegida (todas menos la tabla). Lo usan la tarjeta y el PDF. */
export function ChartPlot({ result, view }: { result: ChartResult; view: ViewId }) {
  if (view === "cards" && result.cards) return <StatCards cards={result.cards} />;
  if (view === "lines") return <LineChart result={result} />;
  if (view === "pie") return <PieChart result={result} />;

  if (view === "stacked") {
    return (
      <>
        <StackedChart result={result} />
        <CategoryLegend result={result} />
      </>
    );
  }

  return <BarChart result={result} />;
}
