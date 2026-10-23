import { chileDay, chileLocalToUtc } from "../stats/time";

export { chileLocalToUtc };

/** Hoy en Chile, como numero de dia (UTC a medianoche) para sumar y restar dias. */
export function chileToday(now: Date): number {
  const { year, month, day } = chileDay(now);

  return Date.UTC(year, month - 1, day);
}
