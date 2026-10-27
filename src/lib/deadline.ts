/**
 * Date limite de modification des plats : fin de journée, heure de Belgique,
 * du jour J-7 (28 novembre pour le 5 décembre, 29 novembre pour le 6).
 */

const BRUSSELS = "Europe/Brussels";

export const POLICY_TITLE = "Aucun remboursement";

export const POLICY_TEXT =
  "Aucun remboursement n'est possible. Les places ne peuvent pas être modifiées. Seuls les plats peuvent être changés jusqu'à une semaine avant le spectacle.";

function part(parts: Intl.DateTimeFormatPart[], type: string): number {
  return Number(parts.find((item) => item.type === type)?.value ?? "0");
}

function brusselsOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRUSSELS,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const asUtc = Date.UTC(
    part(parts, "year"),
    part(parts, "month") - 1,
    part(parts, "day"),
    part(parts, "hour") % 24,
    part(parts, "minute"),
    part(parts, "second")
  );
  return asUtc - instant.getTime();
}

export function endOfCalendarDayBrussels(year: number, month: number, day: number): Date {
  const wall = Date.UTC(year, month - 1, day, 23, 59, 59, 0);
  const offset = brusselsOffsetMs(new Date(wall));
  let instant = wall - offset;
  const corrected = brusselsOffsetMs(new Date(instant));
  if (corrected !== offset) instant = wall - corrected;
  return new Date(instant + 999);
}

export function calendarParts(input: string | Date): { year: number; month: number; day: number } {
  const iso = (typeof input === "string" ? input : input.toISOString()).slice(0, 10);
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

export function mealEditDeadline(eventDate: string | Date): Date {
  const { year, month, day } = calendarParts(eventDate);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() - 7);
  return endOfCalendarDayBrussels(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
}

export function canEditMeals(eventDate: string | Date, now: Date = new Date()): boolean {
  return now.getTime() <= mealEditDeadline(eventDate).getTime();
}

export function formatDeadlineFr(deadline: Date): string {
  return new Intl.DateTimeFormat("fr-BE", {
    timeZone: BRUSSELS,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(deadline);
}
