import type { Child, CheckupRecord, CreateCheckupInput, CreateChildInput } from "@child-growth/shared";

export interface ChildGrowthRepository {
  createChild(input: CreateChildInput): Promise<Child>;
  getChildById(childId: string): Promise<Child | undefined>;
  listChildren(): Promise<Child[]>;
  createCheckup(childId: string, input: CreateCheckupInput): Promise<CheckupRecord>;
  listCheckupsByChild(childId: string): Promise<CheckupRecord[]>;
  hasCheckupOnDate(childId: string, checkupDate: string): Promise<boolean>;
}
