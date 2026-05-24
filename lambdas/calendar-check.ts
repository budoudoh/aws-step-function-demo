/**
 * S.T.E.P. — CalendarCheck
 *
 * Checks the first meeting of the day and calculates how many minutes
 * of buffer exist before you absolutely must be conscious and presentable.
 *
 * Runs inside the Parallel state alongside weather-check and weekend-check.
 */

export interface CalendarCheckOutput {
  firstMeeting: string | null;
  bufferMinutes: number;
  meetingTitle: string | null;
  isCritical: boolean;
}

const DEMO_MEETINGS = [
  { title: "1:1 with Skip Level",            time: "09:00", critical: true  },
  { title: "Team Standup",                   time: "09:30", critical: false },
  { title: "Product Review (you're driving)", time: "10:00", critical: true  },
  { title: "Async-friendly (really an email)", time: "11:00", critical: false },
  null, // no meetings — free morning!
];

export const handler = async (): Promise<CalendarCheckOutput> => {
  const meeting = DEMO_MEETINGS[Math.floor(Math.random() * DEMO_MEETINGS.length)];

  if (!meeting) {
    console.log("📅 No morning meetings. Calendar gods are smiling.");
    return { firstMeeting: null, bufferMinutes: 120, meetingTitle: null, isCritical: false };
  }

  const [hours, minutes] = meeting.time.split(":").map(Number);
  const now = new Date();
  const meetingDate = new Date(now);
  meetingDate.setHours(hours, minutes, 0, 0);

  const bufferMinutes = Math.max(0, Math.floor((meetingDate.getTime() - now.getTime()) / 60_000));

  console.log(`📅 First meeting: "${meeting.title}" at ${meeting.time} — ${bufferMinutes} min buffer`);

  return {
    firstMeeting: meeting.time,
    bufferMinutes,
    meetingTitle: meeting.title,
    isCritical: meeting.critical,
  };
};
