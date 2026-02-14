import type { Child, GrowthPoint, CheckupRecord } from "@child-growth/shared";
import { daysBetween, monthsBetween } from "../utils/date";
import { round } from "../utils/math";

export function buildGrowthSeries(child: Child, checkups: CheckupRecord[]): GrowthPoint[] {
  const sorted = [...checkups].sort((a, b) => a.checkupDate.localeCompare(b.checkupDate));

  return sorted.map((checkup, index) => {
    const previous = sorted[index - 1];
    const base: GrowthPoint = {
      checkupId: checkup.id,
      checkupDate: checkup.checkupDate,
      ageMonths: round(monthsBetween(child.birthDate, checkup.checkupDate)),
      heightCm: checkup.heightCm,
      weightKg: checkup.weightKg
    };

    if (!previous) {
      return base;
    }

    const deltaHeightCm = round(checkup.heightCm - previous.heightCm);
    const deltaWeightKg = round(checkup.weightKg - previous.weightKg);
    const dayDiff = daysBetween(previous.checkupDate, checkup.checkupDate);
    const annualFactor = 365 / dayDiff;

    return {
      ...base,
      deltaHeightCm,
      deltaWeightKg,
      annualizedHeightCm: round(deltaHeightCm * annualFactor),
      annualizedWeightKg: round(deltaWeightKg * annualFactor)
    };
  });
}
