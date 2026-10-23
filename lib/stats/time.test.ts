import { describe, expect, it } from "vitest";

import {
  MAX_BUCKETS,
  bucketKey,
  bucketLabel,
  bucketRange,
  chileDay,
  nextBucketKey,
  periodStart,
} from "./time";

describe("chileDay", () => {
  it("cuenta el dia en hora de Chile, no en UTC", () => {
    // Octubre es horario de verano en Chile (UTC-3): 02:30 UTC es la noche anterior.
    expect(chileDay(new Date("2026-10-19T02:30:00Z"))).toEqual({
      year: 2026,
      month: 10,
      day: 18,
    });
    expect(chileDay(new Date("2026-10-19T03:30:00Z")).day).toBe(19);
  });

  it("en invierno el desfase es de 4 horas", () => {
    expect(chileDay(new Date("2026-07-10T03:30:00Z")).day).toBe(9);
    expect(chileDay(new Date("2026-07-10T04:30:00Z")).day).toBe(10);
  });
});

describe("bucketKey", () => {
  it("dia: la fecha chilena", () => {
    expect(bucketKey(new Date("2026-10-19T02:30:00Z"), "day")).toBe("2026-10-18");
  });

  it("semana: el lunes que la abre (el domingo pertenece a la semana anterior)", () => {
    // 2026-10-18 es domingo; 2026-10-19 es lunes.
    expect(bucketKey(new Date("2026-10-18T15:00:00Z"), "week")).toBe("2026-10-12");
    expect(bucketKey(new Date("2026-10-19T15:00:00Z"), "week")).toBe("2026-10-19");
    expect(bucketKey(new Date("2026-10-25T15:00:00Z"), "week")).toBe("2026-10-19");
  });

  it("mes", () => {
    expect(bucketKey(new Date("2026-10-31T23:00:00Z"), "month")).toBe("2026-10");
    // 01:00 UTC del 1 de noviembre aun es 31 de octubre en Chile.
    expect(bucketKey(new Date("2026-11-01T01:00:00Z"), "month")).toBe("2026-10");
  });
});

describe("nextBucketKey", () => {
  it("avanza un dia, una semana o un mes, cruzando fin de mes y de ano", () => {
    expect(nextBucketKey("2026-10-31", "day")).toBe("2026-11-01");
    expect(nextBucketKey("2026-12-28", "week")).toBe("2027-01-04");
    expect(nextBucketKey("2026-12", "month")).toBe("2027-01");
    expect(nextBucketKey("2026-10", "month")).toBe("2026-11");
  });
});

describe("bucketLabel", () => {
  it("textos cortos en espanol", () => {
    expect(bucketLabel("2026-10-05", "day")).toBe("5 oct");
    expect(bucketLabel("2026-10-19", "week")).toBe("sem. 19 oct");
    expect(bucketLabel("2026-10", "month")).toBe("oct 2026");
  });
});

describe("bucketRange", () => {
  const now = new Date("2026-10-21T15:00:00Z");

  it("no se salta periodos: un dia sin actividad es un 0", () => {
    expect(bucketRange("2026-10-18", now, "day")).toEqual([
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
    ]);
  });

  it("sin datos no hay periodos", () => {
    expect(bucketRange(null, now, "day")).toEqual([]);
  });

  it("limita los periodos hacia atras desde hoy", () => {
    const keys = bucketRange("2020-01-01", now, "day");

    expect(keys).toHaveLength(MAX_BUCKETS.day);
    expect(keys[keys.length - 1]).toBe("2026-10-21");
  });

  it("un primer periodo en el futuro no entrega nada", () => {
    expect(bucketRange("2027-01-01", now, "month")).toEqual([]);
  });
});

describe("periodStart (ventanas de actividad reciente)", () => {
  // Miercoles 21 de octubre de 2026, 12:00 en Chile (UTC-3).
  const now = new Date("2026-10-21T15:00:00Z");
  const from = (period: Parameters<typeof periodStart>[0]) => periodStart(period, now)?.toISOString();

  it("sin limite para «todo el tiempo»", () => {
    expect(periodStart("all", now)).toBeNull();
  });

  it("los últimos N días incluyen hoy y empiezan a medianoche de Chile", () => {
    expect(from("3d")).toBe("2026-10-19T03:00:00.000Z");
    expect(from("7d")).toBe("2026-10-15T03:00:00.000Z");
    expect(from("30d")).toBe("2026-09-22T03:00:00.000Z");
  });

  it("la semana actual parte el lunes y el mes actual el día 1", () => {
    expect(from("week")).toBe("2026-10-19T03:00:00.000Z");
    expect(from("month")).toBe("2026-10-01T03:00:00.000Z");
  });

  it("en lunes la semana actual es solo hoy", () => {
    expect(periodStart("week", new Date("2026-10-19T20:00:00Z"))?.toISOString()).toBe("2026-10-19T03:00:00.000Z");
  });

  it("cruza el cambio de hora de Chile sin correrse un día", () => {
    // El horario de verano empieza el 6 sep 2026 (UTC-3 desde UTC-4): el 1 sep aun es UTC-4.
    expect(periodStart("month", new Date("2026-09-10T15:00:00Z"))?.toISOString()).toBe("2026-09-01T04:00:00.000Z");
  });

  it("a las 23:30 de Chile sigue siendo el mismo día aunque en UTC ya sea el siguiente", () => {
    expect(periodStart("3d", new Date("2026-10-22T02:30:00Z"))?.toISOString()).toBe("2026-10-19T03:00:00.000Z");
  });
});
