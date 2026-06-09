import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Kolumny treści w Quotes (intro / timeline_plan / scope_plan) jako Markdown (varchar).
 * Idempotentna — bezpieczna nawet jeśli onInit już dodał kolumny.
 * (Konwersję ewentualnych starych kolumn jsonb robi migracja 20260609_160000.)
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "intro" varchar;
    ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "timeline_plan" varchar;
    ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "scope_plan" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "quotes" DROP COLUMN IF EXISTS "intro";
    ALTER TABLE "quotes" DROP COLUMN IF EXISTS "timeline_plan";
    ALTER TABLE "quotes" DROP COLUMN IF EXISTS "scope_plan";
  `)
}
