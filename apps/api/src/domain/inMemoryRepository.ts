import { randomUUID } from "node:crypto";
import type { ChildGrowthRepository } from "./repository";
import type {
  Child,
  CheckupRecord,
  CreateCheckupInput,
  CreateChildInput
} from "@child-growth/shared";

export class InMemoryChildGrowthRepository implements ChildGrowthRepository {
  private readonly children = new Map<string, Child>();
  private readonly checkups = new Map<string, CheckupRecord[]>();

  async createChild(input: CreateChildInput): Promise<Child> {
    const child: Child = {
      id: randomUUID(),
      name: input.name,
      birthDate: input.birthDate,
      sex: input.sex,
      createdAt: new Date().toISOString()
    };

    this.children.set(child.id, child);
    this.checkups.set(child.id, []);
    return child;
  }

  async getChildById(childId: string): Promise<Child | undefined> {
    return this.children.get(childId);
  }

  async listChildren(): Promise<Child[]> {
    return Array.from(this.children.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
  }

  async createCheckup(childId: string, input: CreateCheckupInput): Promise<CheckupRecord> {
    const record: CheckupRecord = {
      id: randomUUID(),
      childId,
      checkupDate: input.checkupDate,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      headCircumferenceCm: input.headCircumferenceCm,
      notes: input.notes,
      source: input.source,
      ocrRawText: input.ocrRawText,
      createdAt: new Date().toISOString()
    };

    const existing = this.checkups.get(childId);
    if (!existing) {
      this.checkups.set(childId, [record]);
      return record;
    }

    existing.push(record);
    existing.sort((a, b) => a.checkupDate.localeCompare(b.checkupDate));
    return record;
  }

  async listCheckupsByChild(childId: string): Promise<CheckupRecord[]> {
    return [...(this.checkups.get(childId) ?? [])].sort((a, b) =>
      a.checkupDate.localeCompare(b.checkupDate)
    );
  }

  async hasCheckupOnDate(childId: string, checkupDate: string): Promise<boolean> {
    const list = await this.listCheckupsByChild(childId);
    return list.some(
      (checkup) => checkup.checkupDate === checkupDate
    );
  }
}
