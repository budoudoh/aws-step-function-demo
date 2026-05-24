/**
 * S.T.E.P. — WeatherCheck
 *
 * Assesses weather conditions and computes a hair-day complexity score
 * (0–10). High humidity or rain means more prep time is required, which
 * directly factors into the snooze window calculation.
 *
 * Runs inside the Parallel state alongside calendar-check and weekend-check.
 */

export interface WeatherCheckOutput {
  condition: string;
  tempF: number;
  humidity: number;
  hairComplexityScore: number; // 0 = wash-and-go, 10 = full production
  recommendation: string;
}

const CONDITIONS = [
  { condition: "Clear",        tempF: 72,  humidity: 35,  score: 2,  rec: "Low stakes. 5 extra minutes max."                          },
  { condition: "Partly Cloudy",tempF: 68,  humidity: 52,  score: 4,  rec: "Moderate effort. Consider a hat as backup."               },
  { condition: "Humid",        tempF: 78,  humidity: 82,  score: 8,  rec: "High stakes. Factor in product time."                     },
  { condition: "Rainy",        tempF: 63,  humidity: 91,  score: 9,  rec: "Why even try. Hat day. Accept it."                        },
  { condition: "Thunderstorm", tempF: 59,  humidity: 96,  score: 10, rec: "This is now a hat-and-sunglasses situation. Stay home?"   },
];

export const handler = async (): Promise<WeatherCheckOutput> => {
  const weather = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
  console.log(`🌤  Weather: ${weather.condition}, ${weather.tempF}°F, ${weather.humidity}% humidity → hair score ${weather.hairComplexityScore}`);
  return {
    condition:           weather.condition,
    tempF:               weather.tempF,
    humidity:            weather.humidity,
    hairComplexityScore: weather.hairComplexityScore,
    recommendation:      weather.rec,
  };
};
