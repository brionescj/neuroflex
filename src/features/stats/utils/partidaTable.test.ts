import { describe, expect, it } from "vitest";

import { partidaTable, totalTimeText, unitsText } from "./partidaTable";
import type { PartidaDetail } from "../types";

const detail = (game: PartidaDetail["game"], rows: PartidaDetail["rows"]): PartidaDetail => ({
  attemptId: "a",
  game,
  attemptNumber: 1,
  startedAt: "10 oct 2026",
  outcome: "Terminada",
  rows,
  notes: [],
});

const row = (extra: Partial<PartidaDetail["rows"][number]> = {}): PartidaDetail["rows"][number] => ({
  label: "Nivel 1",
  tryText: "Intento 1",
  result: "Superado",
  ok: true,
  seconds: 12.34,
  lines: [],
  facts: [],
  notice: null,
  ...extra,
});

describe("tabla del detalle de una partida", () => {
  it("una columna por secuencia, con ✗ en lo fuera de lugar, y los datos sueltos al final", () => {
    const table = partidaTable(
      detail("color-sequence", [
        row({
          lines: [
            { title: "Pidió el sistema", items: [{ text: "Azul" }, { text: "Rojo" }] },
            { title: "Marcó el estudiante", items: [{ text: "Azul", ok: true }, { text: "Verde", ok: false }] },
          ],
          facts: [{ label: "Colores en su lugar", value: "1 de 2" }],
        }),
      ]),
    );

    expect(table.columns).toEqual(["Nivel", "Intento", "Resultado", "Tiempo", "Pidió el sistema", "Marcó el estudiante", "Datos"]);
    expect(table.rows[0]).toEqual(["Nivel 1", "Intento 1", "Superado", "12,3 s", "Azul · Rojo", "Azul · Verde ✗", "Colores en su lugar: 1 de 2"]);
  });

  it("mini casos no lleva columna de intento; un nivel sin detalle muestra el aviso", () => {
    const table = partidaTable(detail("mini-cases", [row({ label: "Caso 1", tryText: null, notice: "No guardó el orden." })]));

    expect(table.columns).toEqual(["Caso", "Resultado", "Tiempo", "Datos"]);
    expect(table.rows[0]?.[3]).toBe("No guardó el orden.");
  });

  it("tiempo total y cantidad de niveles o casos", () => {
    const two = detail("node-connection", [row({ seconds: 50 }), row({ label: "Nivel 2", seconds: 40 })]);

    expect(totalTimeText(two)).toBe("1 min 30 s");
    expect(totalTimeText(detail("node-connection", [row({ seconds: 8 })]))).toBe("8 s");
    expect(unitsText(two)).toBe("2 niveles");
    expect(unitsText(detail("mini-cases", [row()]))).toBe("1 caso");
    // Dos intentos del mismo nivel son un solo nivel.
    expect(unitsText(detail("color-sequence", [row(), row({ tryText: "Intento 2" })]))).toBe("1 nivel");
  });
});
