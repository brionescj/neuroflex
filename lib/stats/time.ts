/**
 * Calendario de las estadisticas. Los dias se cuentan en la hora de Chile: un
 * resultado de las 23:30 no debe caer en el dia siguiente por estar en UTC.
 */

export type Bucket = "day" | "week" | "month";

export const STATS_TIME_ZONE = "America/Santiago";

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Cuantos periodos como maximo se muestran hacia atras desde hoy. */
export const MAX_BUCKETS: Record<Bucket, number> = {
  day: 60,
  week: 26,
  month: 24,
};

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STATS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type CalendarDay = { year: number; month: number; day: number };

/** El dia calendario (hora de Chile) en que cae un instante. */
export function chileDay(at: Date): CalendarDay {
  const parts = formatter.formatToParts(at);
  const pick = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dayKey({ year, month, day }: CalendarDay): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function fromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(Date.UTC(year as number, (month as number) - 1, day ?? 1));
}

function toKey(date: Date): string {
  return dayKey({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

/** Clave ordenable del periodo que contiene `at`: AAAA-MM-DD (dia o lunes) o AAAA-MM. */
export function bucketKey(at: Date, bucket: Bucket): string {
  const day = chileDay(at);

  if (bucket === "month") return `${day.year}-${pad(day.month)}`;

  const key = dayKey(day);

  if (bucket === "day") return key;

  // Semana que empieza el lunes.
  const date = fromKey(key);
  const sinceMonday = (date.getUTCDay() + 6) % 7;

  date.setUTCDate(date.getUTCDate() - sinceMonday);

  return toKey(date);
}

/** El periodo siguiente a la clave dada. */
export function nextBucketKey(key: string, bucket: Bucket): string {
  if (bucket === "month") {
    const [year, month] = key.split("-").map(Number) as [number, number];

    return month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
  }

  const date = fromKey(key);

  date.setUTCDate(date.getUTCDate() + (bucket === "day" ? 1 : 7));

  return toKey(date);
}

/** Texto corto para el eje: "21 oct", "sem. 19 oct", "oct 2026". */
export function bucketLabel(key: string, bucket: Bucket): string {
  if (bucket === "month") {
    const [year, month] = key.split("-").map(Number) as [number, number];

    return `${MONTHS[month - 1]} ${year}`;
  }

  const [, month, day] = key.split("-").map(Number) as [number, number, number];
  const text = `${day} ${MONTHS[month - 1]}`;

  return bucket === "week" ? `sem. ${text}` : text;
}

/**
 * Todos los periodos desde `first` hasta el de `now`, sin saltarse ninguno
 * (un dia sin actividad es un 0, no un hueco), con un tope de MAX_BUCKETS
 * hacia atras. Sin `first` (no hay datos) devuelve lista vacia.
 */
export function bucketRange(
  first: string | null,
  now: Date,
  bucket: Bucket,
): string[] {
  if (first === null) return [];

  const last = bucketKey(now, bucket);
  const keys: string[] = [];

  for (let key = first; key <= last; key = nextBucketKey(key, bucket)) {
    keys.push(key);
  }

  return keys.slice(-MAX_BUCKETS[bucket]);
}

const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: STATS_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Lo que marca el reloj de Chile en ese instante, escrito como si fuera UTC. */
function shownInChile(date: Date): number {
  const parts = clock.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
}

/** El instante (UTC) en que el reloj de Chile marca esa fecha y hora. */
export function chileLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wanted;

  // El desfase (-3 o -4 h) depende de la fecha: se corrige hasta que calce.
  for (let i = 0; i < 3; i++) guess += wanted - shownInChile(new Date(guess));

  return new Date(guess);
}

/** Ventanas de tiempo para mirar solo la actividad reciente. */
export type Period = "all" | "3d" | "7d" | "30d" | "week" | "month";

export const PERIODS: readonly Period[] = ["all", "3d", "7d", "30d", "week", "month"];

export const PERIOD_LABELS: Record<Period, string> = {
  all: "Todo el tiempo",
  "3d": "Últimos 3 días",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  week: "Semana actual (desde el lunes)",
  month: "Mes actual",
};

const PERIOD_DAYS: Partial<Record<Period, number>> = { "3d": 3, "7d": 7, "30d": 30 };

/**
 * Desde cuando cuenta un periodo: la medianoche de Chile del primer dia de la
 * ventana. "Ultimos 7 dias" son hoy y los 6 anteriores. null = sin limite.
 */
export function periodStart(period: Period, now: Date): Date | null {
  if (period === "all") return null;

  const today = chileDay(now);
  const date = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const days = PERIOD_DAYS[period];

  if (days !== undefined) {
    date.setUTCDate(date.getUTCDate() - (days - 1));
  } else if (period === "week") {
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  } else {
    date.setUTCDate(1);
  }

  return chileLocalToUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 0, 0);
}

/** Un rango de fechas elegido a mano: dias completos (hora de Chile), AAAA-MM-DD, extremos incluidos. */
export type DateRange = { from: string; to: string };

/** Los rangos que se pueden comparar a la vez. */
export const MAX_DATE_RANGES = 4;

/** Menor y mayor ano que se acepta en un rango. */
export const MIN_RANGE_YEAR = 2020;
export const MAX_RANGE_YEAR = 2100;

/** Una fecha AAAA-MM-DD que existe en el calendario (no el 31 de junio) y esta en los anos aceptados. */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    year >= MIN_RANGE_YEAR &&
    year <= MAX_RANGE_YEAR &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Desde la medianoche del primer dia hasta la medianoche que sigue al ultimo (excluida). */
export function rangeWindow(range: DateRange): { from: Date; until: Date } {
  const [fy, fm, fd] = range.from.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = range.to.split("-").map(Number) as [number, number, number];
  const after = new Date(Date.UTC(ty, tm - 1, td + 1));

  return {
    from: chileLocalToUtc(fy, fm, fd, 0, 0),
    until: chileLocalToUtc(after.getUTCFullYear(), after.getUTCMonth() + 1, after.getUTCDate(), 0, 0),
  };
}

function dayText(key: string): string {
  const [year, month, day] = key.split("-").map(Number) as [number, number, number];

  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** «1 oct 2026 – 31 oct 2026», o un solo dia si el rango es de un dia. */
export function formatDateRange(range: DateRange): string {
  return range.from === range.to ? dayText(range.from) : `${dayText(range.from)} – ${dayText(range.to)}`;
}

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: STATS_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

/** Dia de la semana (0 = lunes ... 6 = domingo) y hora (0 a 23) en Chile. */
export function chileWeekdayHour(at: Date): { weekday: number; hour: number } {
  const { year, month, day } = chileDay(at);
  const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  const hour = Number(hourFormatter.formatToParts(at).find((part) => part.type === "hour")?.value);

  return { weekday, hour: hour === 24 ? 0 : hour };
}
