export type ScoreRange = { startHour: number; endHour: number; score: number };
export type ScoringRules = { baseScore: number | null; timeRanges: ScoreRange[] };

export function hourInRange(hour: number, { startHour, endHour }: ScoreRange) {
  return startHour < endHour
    ? hour >= startHour && hour < endHour
    : startHour > endHour && (hour >= startHour || hour < endHour);
}

export function mealScore(occurredAt: string, rules: (ScoringRules | undefined)[], clock: Intl.DateTimeFormat) {
  const hour = Number(clock.format(new Date(occurredAt)));
  let total = 0;
  let rated = 0;
  for (const food of rules) {
    const score = food?.timeRanges.find(range => hourInRange(hour, range))?.score ?? food?.baseScore;
    if (score != null) {
      total += score;
      rated++;
    }
  }
  return { average: rated ? total / rated : null, rated, total: rules.length };
}

export function localHourClock(timeZone?: string) {
  return new Intl.DateTimeFormat("en", { timeZone, hour: "numeric", hourCycle: "h23", numberingSystem: "latn" });
}
