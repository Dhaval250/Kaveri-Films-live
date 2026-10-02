/**
 * Kaveri Metallising - Production Calculation Formulas
 *
 * Length (m) = Weight(kg) × 1,000,000 ÷ (Width(mm) × Thickness(micron) × Density(g/cc))
 */

export function calculateLength(
  weightKg: number,
  widthMm: number,
  thicknessMicron: number,
  density: number
): number {
  if (widthMm <= 0 || thicknessMicron <= 0 || density <= 0 || weightKg <= 0) {
    return 0;
  }
  const length =
    (weightKg * 1_000_000) / (widthMm * thicknessMicron * density);
  return Math.round(length * 100) / 100;
}

export function calculateWeightFromLength(
  lengthM: number,
  widthMm: number,
  thicknessMicron: number,
  density: number
): number {
  if (widthMm <= 0 || thicknessMicron <= 0 || density <= 0 || lengthM <= 0) {
    return 0;
  }
  const weight =
    (lengthM * widthMm * thicknessMicron * density) / 1_000_000;
  return Math.round(weight * 1000) / 1000;
}

export function calculateScrapLength(
  scrapWeightKg: number,
  widthMm: number,
  thicknessMicron: number,
  density: number
): number {
  return calculateLength(scrapWeightKg, widthMm, thicknessMicron, density);
}

export function calculateScrapPercentage(
  scrapWeightKg: number,
  totalWeightKg: number
): number {
  if (totalWeightKg <= 0) return 0;
  return Math.round((scrapWeightKg / totalWeightKg) * 10000) / 100;
}

export interface LiveCalculations {
  totalInputKg: number;
  totalExpectedKg: number;
  wasteKg: number;
  wastePercentage: number;
  productivityPct: number;
  netLengthM: number;
  scrapLengthM: number;
  scrapPercentage: number;
  /** Scrapping % by weight */
  scrapPctByWeight: number;
  /** Scrapping % by length */
  scrapPctByLength: number;
  /** Productivity % by weight */
  productivityByWeight: number;
  /** Productivity % by length */
  productivityByLength: number;
}

export function calculateLiveAfterScrapping(
  totalWeightKg: number,
  calculatedLength: number,
  scrapWeightKg: number,
  widthMm: number,
  thicknessMicron: number,
  density: number
): LiveCalculations {
  const scrapLengthM = calculateScrapLength(
    scrapWeightKg,
    widthMm,
    thicknessMicron,
    density
  );
  const scrapPercentage = calculateScrapPercentage(
    scrapWeightKg,
    totalWeightKg
  );
  const wasteKg = scrapWeightKg;
  const totalExpectedKg = totalWeightKg - wasteKg;
  const wastePercentage = calculateScrapPercentage(wasteKg, totalWeightKg);
  const productivityPct = Math.round((100 - wastePercentage) * 100) / 100;
  const netLengthM =
    Math.round((calculatedLength - scrapLengthM) * 100) / 100;

  // By weight
  const scrapPctByWeight = wastePercentage;
  const productivityByWeight = productivityPct;

  // By length
  const scrapPctByLength =
    calculatedLength > 0
      ? Math.round((scrapLengthM / calculatedLength) * 10000) / 100
      : 0;
  const productivityByLength =
    Math.round((100 - scrapPctByLength) * 100) / 100;

  return {
    totalInputKg: totalWeightKg,
    totalExpectedKg: Math.round(totalExpectedKg * 1000) / 1000,
    wasteKg: Math.round(wasteKg * 1000) / 1000,
    wastePercentage,
    productivityPct,
    netLengthM,
    scrapLengthM,
    scrapPercentage,
    scrapPctByWeight,
    scrapPctByLength,
    productivityByWeight,
    productivityByLength,
  };
}

export function generatePlanningNumber(date?: Date): string {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 900) + 1).padStart(3, "0");
  return `P_${y}${m}${day}_${seq}`;
}
