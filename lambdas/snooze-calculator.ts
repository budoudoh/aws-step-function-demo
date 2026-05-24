/**
 * S.T.E.P. — SnoozeCalculator
 *
 * Synthesizes all parallel assessment results and the excuse scores into
 * a single, defensible snooze window.
 *
 * Factors:
 *  - Calendar buffer: fewer minutes to first meeting → shorter snooze
 *  - Hair complexity: high score → longer prep time needed → shorter snooze
 *  - Best viable excuse score: higher → more snooze headroom
 *
 * The snoozeSeconds value is used directly by the subsequent Wait state.
 * For demo purposes, values are capped at 30 seconds so the audience
 * doesn't fall asleep watching the execution.
 */

export interface SnoozeCalculatorInput {
  assessments: [
    { firstMeeting: string | null; bufferMinutes: number; isCritical: boolean },  // [0] calendar
    { hairComplexityScore: number; condition: string },                             // [1] weather
    { isWeekend: boolean; dayOfWeek: string },                                      // [2] weekend
  ];
  scoredExcuses: Array<{ id: string; score: number; viable: boolean }>;
}

export interface SnoozeCalculatorOutput {
  snoozeSeconds: number;   // fed into the Wait state
  snoozeMinutes: number;   // human-readable
  snoozeReason: string;
  breakdown: {
    calendarPenalty: number;
    hairPenalty:     number;
    excuseBonus:     number;
    baseSnooze:      number;
  };
}

const DEMO_SCALE = 0.05; // 5% of real seconds — keeps demo snappy

export const handler = async (event: SnoozeCalculatorInput): Promise<SnoozeCalculatorOutput> => {
  const [calendar, weather] = event.assessments;

  // Base snooze: 9 minutes (the classic)
  const BASE_MINUTES = 9;

  // Calendar penalty: critical meeting within 45 min → lose up to 6 min
  const calendarPenalty = calendar.isCritical
    ? Math.min(6, Math.max(0, Math.floor((45 - calendar.bufferMinutes) / 7.5)))
    : 0;

  // Hair penalty: every 2 complexity points = lose 1 minute
  const hairPenalty = Math.floor(weather.hairComplexityScore / 2);

  // Best viable excuse bonus: up to +5 minutes
  const bestExcuse = event.scoredExcuses
    .filter(e => e.viable)
    .sort((a, b) => b.score - a.score)[0];
  const excuseBonus = bestExcuse
    ? Math.floor((bestExcuse.score - 60) / 8)  // 0–5 bonus
    : 0;

  const totalMinutes = Math.max(1, BASE_MINUTES - calendarPenalty - hairPenalty + excuseBonus);

  // Scale down to seconds for the demo
  const snoozeSeconds = Math.max(3, Math.round(totalMinutes * 60 * DEMO_SCALE));

  const reason = bestExcuse
    ? `${totalMinutes} min window justified primarily by: "${bestExcuse.id}" (score: ${bestExcuse.score})`
    : `${totalMinutes} min window — no strong excuses, but we work with what we have`;

  console.log(`🧮 Snooze window: ${totalMinutes} min → ${snoozeSeconds}s (demo scaled) | ${reason}`);

  return {
    snoozeSeconds,
    snoozeMinutes: totalMinutes,
    snoozeReason: reason,
    breakdown: { baseSnooze: BASE_MINUTES, calendarPenalty, hairPenalty, excuseBonus },
  };
};
