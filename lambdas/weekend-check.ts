/**
 * S.T.E.P. — WeekendCheck
 *
 * Determines whether today is a Saturday or Sunday. If true, the Choice
 * state immediately routes to the Succeed ("Sleep In!") terminal state
 * and the rest of the workflow is bypassed entirely.
 *
 * Runs inside the Parallel state alongside calendar-check and weather-check.
 */

export interface WeekendCheckOutput {
  isWeekend: boolean;
  dayOfWeek: string;
  verdict: string;
}

export const handler = async (): Promise<WeekendCheckOutput> => {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = days[now.getDay()];
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  console.log(`📅 Today is ${day}. isWeekend=${isWeekend}`);

  return {
    isWeekend,
    dayOfWeek: day,
    verdict: isWeekend
      ? "It's the weekend. Workflow terminating with extreme prejudice (in your favor)."
      : `It's ${day}. Buckle up.`,
  };
};
