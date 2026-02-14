import { Pool } from "pg";
import type { ChildGrowthRepository } from "./repository";
import type {
  Child,
  CheckupRecord,
  CreateCheckupInput,
  CreateChildInput
} from "@child-growth/shared";

const DDL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  birth_date DATE NOT NULL,
  sex CHAR(1) NOT NULL CHECK (sex IN ('M', 'F')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkups (
  id UUID PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  checkup_date DATE NOT NULL,
  height_cm NUMERIC(5,2) NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  head_circumference_cm NUMERIC(5,2),
  notes TEXT,
  source VARCHAR(10) NOT NULL,
  ocr_raw_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, checkup_date)
);
`;

export class PostgresChildGrowthRepository implements ChildGrowthRepository {
  constructor(private readonly pool: Pool) {}

  static async create(databaseUrl: string): Promise<PostgresChildGrowthRepository> {
    const pool = new Pool({ connectionString: databaseUrl });
    await pool.query(DDL);
    return new PostgresChildGrowthRepository(pool);
  }

  async createChild(input: CreateChildInput): Promise<Child> {
    const result = await this.pool.query<Child>(
      `INSERT INTO children (id, name, birth_date, sex)
       VALUES (gen_random_uuid(), $1, $2::date, $3)
       RETURNING id, name, birth_date::text AS "birthDate", sex, created_at::text AS "createdAt"`,
      [input.name, input.birthDate, input.sex]
    );
    return result.rows[0];
  }

  async getChildById(childId: string): Promise<Child | undefined> {
    const result = await this.pool.query<Child>(
      `SELECT id, name, birth_date::text AS "birthDate", sex, created_at::text AS "createdAt"
       FROM children
       WHERE id = $1`,
      [childId]
    );
    return result.rows[0];
  }

  async listChildren(): Promise<Child[]> {
    const result = await this.pool.query<Child>(
      `SELECT id, name, birth_date::text AS "birthDate", sex, created_at::text AS "createdAt"
       FROM children
       ORDER BY created_at ASC`
    );
    return result.rows;
  }

  async createCheckup(childId: string, input: CreateCheckupInput): Promise<CheckupRecord> {
    const result = await this.pool.query<CheckupRecord>(
      `INSERT INTO checkups (
        id, child_id, checkup_date, height_cm, weight_kg, head_circumference_cm, notes, source, ocr_raw_text
       ) VALUES (
        gen_random_uuid(), $1, $2::date, $3, $4, $5, $6, $7, $8
       )
       RETURNING
         id,
         child_id AS "childId",
         checkup_date::text AS "checkupDate",
         height_cm::float8 AS "heightCm",
         weight_kg::float8 AS "weightKg",
         head_circumference_cm::float8 AS "headCircumferenceCm",
         notes,
         source,
         ocr_raw_text AS "ocrRawText",
         created_at::text AS "createdAt"`,
      [
        childId,
        input.checkupDate,
        input.heightCm,
        input.weightKg,
        input.headCircumferenceCm ?? null,
        input.notes ?? null,
        input.source,
        input.ocrRawText ?? null
      ]
    );
    return result.rows[0];
  }

  async listCheckupsByChild(childId: string): Promise<CheckupRecord[]> {
    const result = await this.pool.query<CheckupRecord>(
      `SELECT
         id,
         child_id AS "childId",
         checkup_date::text AS "checkupDate",
         height_cm::float8 AS "heightCm",
         weight_kg::float8 AS "weightKg",
         head_circumference_cm::float8 AS "headCircumferenceCm",
         notes,
         source,
         ocr_raw_text AS "ocrRawText",
         created_at::text AS "createdAt"
       FROM checkups
       WHERE child_id = $1
       ORDER BY checkup_date ASC`,
      [childId]
    );
    return result.rows;
  }

  async hasCheckupOnDate(childId: string, checkupDate: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM checkups WHERE child_id = $1 AND checkup_date = $2::date
       )`,
      [childId, checkupDate]
    );
    return result.rows[0]?.exists ?? false;
  }
}
