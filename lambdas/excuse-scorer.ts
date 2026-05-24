/**
 * S.T.E.P. — ExcuseScorer
 *
 * Invoked once per item by the Map state iterating over the excuse inventory.
 * Scores each excuse's viability on a 0–100 scale and marks it as viable if
 * the score exceeds the threshold.
 *
 * The highest viable excuse score feeds into the snooze window calculation.
 */

export interface ExcuseInput {
  id: string;
  excuse: string;
}

export interface ExcuseScorerOutput {
  id: string;
  excuse: string;
  score: number;       // 0–100
  viable: boolean;     // score >= 60
  reasoning: string;
}

// Deterministic base scores per excuse type, with random variance to keep the
// demo interesting on repeated runs.
const BASE_SCORES: Record<string, number> = {
  traffic:   72,
  outfit:    45,
  dog:       81,   // The dog wins almost every time.
  meeting:   38,
  breakfast: 55,
  podcast:   29,
};

export const handler = async (event: ExcuseInput): Promise<ExcuseScorerOutput> => {
  const base = BASE_SCORES[event.id] ?? 50;
  const variance = Math.floor(Math.random() * 20) - 10; // ±10
  const score = Math.min(100, Math.max(0, base + variance));
  const viable = score >= 60;

  console.log(`📋 Excuse "${event.excuse}" scored ${score}/100 — ${viable ? "VIABLE ✅" : "rejected ❌"}`);

  const reasoningMap: Record<string, string> = {
    traffic:   "Objectively verifiable. Classifies as force majeure.",
    outfit:    "Subjective. Judge may not be sympathetic.",
    dog:       "Universal sympathy. Nearly unimpeachable.",
    meeting:   "Risky. The meeting was on the calendar.",
    breakfast: "Noble intent, questionable necessity.",
    podcast:   "Weak. You can pause a podcast.",
  };

  return {
    id: event.id,
    excuse: event.excuse,
    score,
    viable,
    reasoning: reasoningMap[event.id] ?? "Evaluated on general merits.",
  };
};
