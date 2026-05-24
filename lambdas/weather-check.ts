/**
 * S.T.E.P. — WeatherCheck
 *
 * Assesses weather conditions and computes an outfit complexity score
 * (0–10). Bad weather means more deliberation over what to wear, which
 * directly factors into the snooze window calculation.
 *
 * Runs inside the Parallel state alongside calendar-check and weekend-check.
 */

export interface WeatherCheckOutput {
  condition: string;
  tempF: number;
  humidity: number;
  outfitComplexityScore: number; // 0 = grab-and-go, 10 = full wardrobe crisis
  recommendation: string;
}

const CONDITIONS = [
  { condition: "Clear",        tempF: 72,  humidity: 35,  outfitComplexityScore: 2,  recommendation: "Easy choice. Anything works."                                  },
  { condition: "Partly Cloudy",tempF: 68,  humidity: 52,  outfitComplexityScore: 4,  recommendation: "Bring a light layer just in case."                            },
  { condition: "Humid",        tempF: 78,  humidity: 82,  outfitComplexityScore: 8,  recommendation: "Breathable fabrics only. Choose wisely."                      },
  { condition: "Rainy",        tempF: 63,  humidity: 91,  outfitComplexityScore: 9,  recommendation: "Rain jacket is non-negotiable. Boots if you have them."       },
  { condition: "Thunderstorm", tempF: 59,  humidity: 96,  outfitComplexityScore: 10, recommendation: "Full weatherproofing required. Consider staying home."        },
];

export const handler = async (): Promise<WeatherCheckOutput> => {
  const weather = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
  console.log(`🌤  Weather: ${weather.condition}, ${weather.tempF}°F, ${weather.humidity}% humidity → outfit score ${weather.outfitComplexityScore}`);
  return {
    condition:            weather.condition,
    tempF:                weather.tempF,
    humidity:             weather.humidity,
    outfitComplexityScore: weather.outfitComplexityScore,
    recommendation:       weather.recommendation,
  };
};
