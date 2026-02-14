export type Sex = "M" | "F";

export type CheckupSource = "manual" | "ocr";

export interface Child {
  id: string;
  name: string;
  birthDate: string;
  sex: Sex;
  createdAt: string;
}

export interface CheckupRecord {
  id: string;
  childId: string;
  checkupDate: string;
  heightCm: number;
  weightKg: number;
  headCircumferenceCm?: number;
  notes?: string;
  source: CheckupSource;
  ocrRawText?: string;
  createdAt: string;
}

export interface GrowthPoint {
  checkupId: string;
  checkupDate: string;
  ageMonths: number;
  heightCm: number;
  weightKg: number;
  deltaHeightCm?: number;
  deltaWeightKg?: number;
  annualizedHeightCm?: number;
  annualizedWeightKg?: number;
}

export interface PredictionRange {
  lower: number;
  expected: number;
  upper: number;
}

export interface PredictionResult {
  status: "ok" | "insufficient_data";
  nextCheckupDate: string;
  method: "moving_average";
  confidenceLevel: number;
  heightCm?: PredictionRange;
  weightKg?: PredictionRange;
  reason?: string;
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
}

export interface CreateChildInput {
  name: string;
  birthDate: string;
  sex: Sex;
}

export interface CreateCheckupInput {
  checkupDate: string;
  heightCm: number;
  weightKg: number;
  headCircumferenceCm?: number;
  notes?: string;
  source: CheckupSource;
  ocrRawText?: string;
}
