import { describe, expect, it } from "vitest";

import { MAX_COMPARED_STUDENTS, parseChartRequest } from "./request";

function ok(query: Record<string, unknown>) {
  const parsed = parseChartRequest(query);

  if (!parsed.ok) throw new Error(parsed.message);

  return parsed.request;
}

function message(query: Record<string, unknown>) {
  const parsed = parseChartRequest(query);

  return parsed.ok ? null : parsed.message;
}

describe("parseChartRequest", () => {
  it("completa los valores por defecto", () => {
    expect(ok({ chart: "cs-max-level" })).toEqual({
      chart: "cs-max-level",
      groupBy: "none",
      partida: null,
      countBy: "students",
      period: "all",
      range: null,
      ranges: [],
      filters: {},
      ageRange: null,
      students: [],
      options: { as: "auto" },
    });
  });

  it("rechaza un grafico que no existe", () => {
    expect(message({ chart: "nope" })).toMatch(/no existe/);
    expect(message({})).toMatch(/no existe/);
  });

  it("acepta filtros como texto JSON y descarta los vacios", () => {
    const request = ok({
      chart: "nc-levels",
      filters: JSON.stringify({ paralelo: ["1", "2"], gender: [] }),
    });

    expect(request.filters).toEqual({ paralelo: ["1", "2"] });
  });

  it("rechaza filtros con caracteristicas desconocidas, mal formados o enormes", () => {
    expect(message({ chart: "nc-levels", filters: '{"colorFavorito":["x"]}' })).toMatch(/filtros/);
    expect(message({ chart: "nc-levels", filters: "no es json" })).toMatch(/filtros/);
    expect(message({ chart: "nc-levels", filters: '{"paralelo":"1"}' })).toMatch(/filtros/);
    expect(message({ chart: "nc-levels", filters: '{"paralelo":[1]}' })).toMatch(/filtros/);
    expect(message({ chart: "nc-levels", filters: JSON.stringify({ region: ["x".repeat(81)] }) })).toMatch(/filtros/);
    expect(message({ chart: "nc-levels", filters: "[".repeat(7000) })).toMatch(/filtros/);
  });

  it("la edad es un rango entero de 17 a 80; un extremo puede quedar abierto", () => {
    expect(ok({ chart: "nc-levels", age: '{"min":18,"max":25}' }).ageRange).toEqual({ min: 18, max: 25 });
    expect(ok({ chart: "nc-levels", age: '{"min":30,"max":null}' }).ageRange).toEqual({ min: 30, max: null });
    expect(ok({ chart: "nc-levels", age: '{"max":22}' }).ageRange).toEqual({ min: null, max: 22 });
    expect(ok({ chart: "nc-levels", age: '{"min":null,"max":null}' }).ageRange).toBeNull();
    expect(ok({ chart: "nc-levels", age: '{"min":25,"max":25}' }).ageRange).toEqual({ min: 25, max: 25 });
    expect(ok({ chart: "nc-levels", age: '{"min":17,"max":80}' }).ageRange).toEqual({ min: 17, max: 80 });

    for (const bad of ['{"min":30,"max":20}', '{"min":16}', '{"max":81}', '{"min":5}', '{"min":18.5}', '{"min":"18"}', "[]", "x"]) {
      expect(message({ chart: "nc-levels", age: bad }), bad).toMatch(/edad/);
    }
  });

  it("filtra por ciudad y por tramo de edad, y rechaza lo que no es una caracteristica", () => {
    expect(ok({ chart: "nc-levels", filters: '{"ciudad":["Temuco"]}' }).filters).toEqual({ ciudad: ["Temuco"] });
    expect(ok({ chart: "nc-levels", filters: '{"ageBand":["21-25","26-30"]}' }).filters).toEqual({
      ageBand: ["21-25", "26-30"],
    });
    expect(message({ chart: "nc-levels", filters: '{"edad":["21-25"]}' })).toMatch(/filtros/);
  });

  it("valida la forma de comparar y la partida", () => {
    expect(ok({ chart: "nc-levels", groupBy: "gender" }).groupBy).toBe("gender");
    expect(message({ chart: "nc-levels", groupBy: "color" })).toMatch(/comparar/);
    expect(message({ chart: "nc-levels", partida: "second" })).toMatch(/partida/);
    expect(message({ chart: "nc-levels", partida: "first" })).toMatch(/partida/);
    expect(message({ chart: "nc-levels", partida: "0" })).toMatch(/partida/);
    expect(message({ chart: "nc-levels", partida: "-3" })).toMatch(/partida/);
    expect(message({ chart: "nc-levels", partida: "2.5" })).toMatch(/partida/);
    expect(message({ chart: "nc-levels", partida: "501" })).toMatch(/partida/);
    expect(ok({ chart: "nc-levels", partida: "12" }).partida).toBe(12);
    expect(ok({ chart: "nc-levels", partida: "" }).partida).toBeNull();
    expect(ok({ chart: "nc-levels" }).partida).toBeNull();
  });

  it("al comparar por estudiante exige entre 1 y 6 estudiantes distintos", () => {
    expect(message({ chart: "nc-levels", groupBy: "student" })).toMatch(/al menos un estudiante/);

    const many = Array.from({ length: MAX_COMPARED_STUDENTS + 1 }, (_, i) => `1111111${i}-1`);

    expect(
      message({ chart: "nc-levels", groupBy: "student", students: JSON.stringify(many) }),
    ).toMatch(/hasta 6/);

    const request = ok({
      chart: "nc-levels",
      groupBy: "student",
      students: JSON.stringify(["12345678-5", "12345678-5", "9876543-2"]),
    });

    expect(request.students).toEqual(["12345678-5", "9876543-2"]);
  });

  it("ignora los estudiantes si no se compara por estudiante", () => {
    const request = ok({
      chart: "nc-levels",
      groupBy: "none",
      students: JSON.stringify(["12345678-5"]),
    });

    expect(request.students).toEqual([]);
  });

  it("rechaza estudiantes que no parecen un RUT", () => {
    expect(
      message({ chart: "nc-levels", groupBy: "student", students: '["<script>"]' }),
    ).toMatch(/estudiantes elegidos/);
  });

  it("valida las opciones del grafico contra las que permite", () => {
    expect(
      ok({ chart: "cs-pass-rate", options: '{"measure":"anyTry"}' }).options,
    ).toEqual({ measure: "anyTry" });

    expect(message({ chart: "cs-pass-rate", options: '{"measure":"otra"}' })).toMatch(/opción/);
    expect(message({ chart: "cs-pass-rate", options: '{"measure":3}' })).toMatch(/opción/);
    expect(message({ chart: "cs-pass-rate", options: "[]" })).toMatch(/opciones/);
  });

  it("ignora opciones que el grafico no tiene", () => {
    expect(ok({ chart: "cs-time", options: '{"measure":"anyTry"}' }).options).toEqual({});
  });

  it("toma el primer valor si un parametro llega repetido", () => {
    expect(ok({ chart: ["nc-levels", "cs-time"], partida: ["3", "5"] })).toMatchObject({
      chart: "nc-levels",
      partida: 3,
    });
  });

  it("valida la unidad a contar y el período", () => {
    expect(ok({ chart: "nc-levels", countBy: "attempts" }).countBy).toBe("attempts");
    expect(message({ chart: "nc-levels", countBy: "games" })).toMatch(/unidad/);

    for (const period of ["all", "3d", "7d", "30d", "week", "month"]) {
      expect(ok({ chart: "nc-levels", period }).period).toBe(period);
    }

    expect(message({ chart: "nc-levels", period: "year" })).toMatch(/período/);
  });

  it("el dispositivo se puede filtrar y comparar, salvo en la participación (que sale de las fichas)", () => {
    expect(ok({ chart: "nc-levels", groupBy: "device" }).groupBy).toBe("device");
    expect(ok({ chart: "activity", filters: '{"device":["mobile"]}' }).filters).toEqual({ device: ["mobile"] });
    expect(message({ chart: "participation", groupBy: "device" })).toMatch(/dispositivo/);
    expect(message({ chart: "participation", filters: '{"device":["mobile"]}' })).toMatch(/dispositivo/);
  });

  describe("rango de fechas", () => {
    const RANGE = '{"from":"2026-10-01","to":"2026-10-31"}';
    const TWO = '[{"from":"2026-06-24","to":"2026-07-24"},{"from":"2026-10-01","to":"2026-10-31"}]';

    it("un rango a mano reemplaza al período y se valida", () => {
      expect(ok({ chart: "nc-levels", range: RANGE }).range).toEqual({ from: "2026-10-01", to: "2026-10-31" });
      expect(ok({ chart: "nc-levels", range: '{"from":"2026-10-05","to":"2026-10-05"}' }).range).toEqual({
        from: "2026-10-05",
        to: "2026-10-05",
      });
      expect(message({ chart: "nc-levels", range: RANGE, period: "7d" })).toMatch(/no los dos/);
      expect(message({ chart: "nc-levels", range: '{"from":"2026-10-31","to":"2026-10-01"}' })).toMatch(/rango de fechas/);
      expect(message({ chart: "nc-levels", range: '{"from":"2026-02-30","to":"2026-03-01"}' })).toMatch(/rango de fechas/);
      expect(message({ chart: "nc-levels", range: '{"from":"2026-10-01"}' })).toMatch(/rango de fechas/);
      expect(message({ chart: "nc-levels", range: '{"from":"2019-12-31","to":"2026-01-01"}' })).toMatch(/rango de fechas/);
      expect(message({ chart: "nc-levels", range: "{" })).toMatch(/rango de fechas/);
    });

    it("un gráfico que no mira partidas ni período no acepta rango", () => {
      expect(message({ chart: "participation", range: RANGE })).toMatch(/período/);
    });

    it("comparar por fechas pide de 2 a 4 rangos válidos y no se mezcla con un período", () => {
      const request = ok({ chart: "nc-levels", groupBy: "dateRange", ranges: TWO });

      expect(request.groupBy).toBe("dateRange");
      expect(request.ranges).toHaveLength(2);

      expect(message({ chart: "nc-levels", groupBy: "dateRange" })).toMatch(/al menos 2 rangos/);
      expect(message({ chart: "nc-levels", groupBy: "dateRange", ranges: `[${RANGE}]` })).toMatch(/al menos 2 rangos/);
      expect(message({ chart: "nc-levels", groupBy: "dateRange", ranges: TWO, period: "7d" })).toMatch(/no se usa un período/);
      expect(message({ chart: "nc-levels", groupBy: "dateRange", ranges: TWO, range: RANGE })).toMatch(/no se usa un período/);
      expect(message({ chart: "nc-levels", groupBy: "dateRange", ranges: `[${RANGE},${RANGE},${RANGE},${RANGE},${RANGE}]` })).toMatch(
        /Los rangos de fechas no son válidos/,
      );
      expect(message({ chart: "nc-levels", groupBy: "dateRange", ranges: '[{"from":"x","to":"y"},{"from":"x","to":"y"}]' })).toMatch(
        /no son válidos/,
      );
      expect(message({ chart: "nc-levels", ranges: TWO })).toMatch(/solo se usan al comparar por fechas/);
      expect(message({ chart: "participation", groupBy: "dateRange", ranges: TWO })).toMatch(/comparar por fechas/);
    });
  });
});
