import type {
  Child,
  CheckupRecord,
  CreateCheckupInput,
  CreateChildInput,
  GrowthPoint,
  PredictionResult
} from "@child-growth/shared";
import type { ChildGrowthRepository } from "../domain/repository";
import { toIsoDate } from "../utils/date";
import { buildGrowthSeries } from "./growthService";
import { predictNextCheckup } from "./predictionService";
import { ConflictError, NotFoundError } from "./errors";

export class ChildGrowthService {
  constructor(private readonly repository: ChildGrowthRepository) {}

  createChild(input: CreateChildInput): Promise<Child> {
    return this.repository.createChild({
      ...input,
      birthDate: toIsoDate(input.birthDate)
    });
  }

  listChildren(): Promise<Child[]> {
    return this.repository.listChildren();
  }

  async getChildByIdOrThrow(childId: string): Promise<Child> {
    const child = await this.repository.getChildById(childId);
    if (!child) {
      throw new NotFoundError("해당 아이를 찾을 수 없습니다.");
    }
    return child;
  }

  async createCheckup(childId: string, input: CreateCheckupInput): Promise<CheckupRecord> {
    await this.getChildByIdOrThrow(childId);

    const checkupDate = toIsoDate(input.checkupDate);
    if (await this.repository.hasCheckupOnDate(childId, checkupDate)) {
      throw new ConflictError("동일 날짜의 검진 기록이 이미 존재합니다.");
    }

    return this.repository.createCheckup(childId, {
      ...input,
      checkupDate
    });
  }

  async getGrowth(childId: string): Promise<{ child: Child; points: GrowthPoint[] }> {
    const child = await this.getChildByIdOrThrow(childId);
    const checkups = await this.repository.listCheckupsByChild(childId);
    return {
      child,
      points: buildGrowthSeries(child, checkups)
    };
  }

  async getPrediction(childId: string): Promise<{ child: Child; prediction: PredictionResult }> {
    const child = await this.getChildByIdOrThrow(childId);
    const checkups = await this.repository.listCheckupsByChild(childId);
    return {
      child,
      prediction: predictNextCheckup(child, checkups)
    };
  }
}
