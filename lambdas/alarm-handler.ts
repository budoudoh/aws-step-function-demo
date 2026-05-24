/**
 * S.T.E.P. — AlarmHandler
 *
 * Registers the alarm firing event and builds the initial execution context,
 * including the excuse inventory that the Map state will iterate over.
 */

export interface AlarmInput {
  alarmTime?: string;
  action?: string;
}

export interface AlarmOutput {
  alarmTime: string;
  dayOfWeek: string;
  excuses: Array<{ id: string; excuse: string }>;
  awake?: boolean;
}

const EXCUSE_INVENTORY = [
  { id: "traffic",    excuse: "Traffic is going to be brutal today" },
  { id: "outfit",     excuse: "My outfit needs extra ironing time" },
  { id: "dog",        excuse: "The dog is staring at me with big sad eyes" },
  { id: "meeting",    excuse: "That first meeting could easily be an email" },
  { id: "breakfast",  excuse: "I should really eat a proper breakfast today" },
  { id: "podcast",    excuse: "I'm 10 minutes into a really good podcast episode" },
];

export const handler = async (event: AlarmInput): Promise<AlarmOutput> => {
  console.log("🚨 ALARM FIRED", JSON.stringify(event));

  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Wake-up check path — simulate human failing to respond (for demo retry behavior)
  if (event.action === "wakeUpCheck") {
    const awake = Math.random() > 0.4; // 60% chance of being awake on first try
    if (!awake) throw new Error("HumanUnresponsive");
    return { alarmTime: now.toISOString(), dayOfWeek: days[now.getDay()], excuses: [], awake: true };
  }

  return {
    alarmTime: now.toISOString(),
    dayOfWeek: days[now.getDay()],
    excuses: EXCUSE_INVENTORY,
  };
};
