import type { Child, GrowthPoint, PredictionResult } from "@child-growth/shared";

export interface ChildDetailView {
  child: Child;
  growth: GrowthPoint[];
  prediction: PredictionResult;
}
