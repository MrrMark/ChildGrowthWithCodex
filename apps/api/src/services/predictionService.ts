import type {
  Child,
  CheckupRecord,
  PredictionResult,
  PredictionRange
} from "@child-growth/shared";
import { addMonths, daysBetween } from "../utils/date";
import { average, round } from "../utils/math";

const CONFIDENCE_LEVEL = 0.8;

function estimateRange(expected: number, recentDiffs: number[], annualFactor: number): PredictionRange {
  const volatility = recentDiffs.length > 0 ? Math.max(...recentDiffs.map(Math.abs)) : 0;
  const margin = round(Math.max(0.3, volatility * annualFactor * 0.5));

  return {
    lower: round(expected - margin),
    expected: round(expected),
    upper: round(expected + margin)
  };
}

export function predictNextCheckup(
  child: Child,
  checkups: CheckupRecord[],
  nextCheckupAfterMonths = 6
): PredictionResult {
  const sorted = [...checkups].sort((a, b) => a.checkupDate.localeCompare(b.checkupDate));

  const nextCheckupDate =
    sorted.length > 0
      ? addMonths(sorted[sorted.length - 1].checkupDate, nextCheckupAfterMonths)
      : addMonths(child.birthDate, 12);

  if (sorted.length < 3) {
    return {
      status: "insufficient_data",
      method: "moving_average",
      confidenceLevel: CONFIDENCE_LEVEL,
      nextCheckupDate,
      reason: "최소 3회 이상의 검진 데이터가 필요합니다."
    };
  }

  const recent = sorted.slice(-3);
  const heightVelocity: number[] = [];
  const weightVelocity: number[] = [];

  for (let i = 1; i < recent.length; i += 1) {
    const prev = recent[i - 1];
    const curr = recent[i];
    const days = daysBetween(prev.checkupDate, curr.checkupDate);
    const annualFactor = 365 / days;
    heightVelocity.push((curr.heightCm - prev.heightCm) * annualFactor);
    weightVelocity.push((curr.weightKg - prev.weightKg) * annualFactor);
  }

  const last = sorted[sorted.length - 1];
  const horizonYearFactor = nextCheckupAfterMonths / 12;

  const expectedHeight = last.heightCm + average(heightVelocity) * horizonYearFactor;
  const expectedWeight = last.weightKg + average(weightVelocity) * horizonYearFactor;

  return {
    status: "ok",
    method: "moving_average",
    confidenceLevel: CONFIDENCE_LEVEL,
    nextCheckupDate,
    heightCm: estimateRange(expectedHeight, heightVelocity, horizonYearFactor),
    weightKg: estimateRange(expectedWeight, weightVelocity, horizonYearFactor)
  };
}
