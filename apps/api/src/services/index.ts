import type { ChildGrowthRepository } from "../domain/repository";
import { InMemoryChildGrowthRepository } from "../domain/inMemoryRepository";
import { PostgresChildGrowthRepository } from "../domain/postgresRepository";
import { ChildGrowthService } from "./childGrowthService";

async function createRepository(): Promise<ChildGrowthRepository> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return PostgresChildGrowthRepository.create(databaseUrl);
  }

  return new InMemoryChildGrowthRepository();
}

export async function createChildGrowthService(): Promise<ChildGrowthService> {
  const repository = await createRepository();
  return new ChildGrowthService(repository);
}
