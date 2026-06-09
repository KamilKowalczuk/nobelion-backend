import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Kolumny richText w Quotes (intro / timeline_plan / scope_plan).
 * Zastąpiły wcześniejsze pola array (blokujące się w panelu).
 * Idempotentna — bezpieczna nawet jeśli onInit już dodał kolumny.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "intro" jsonb;
    ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "timeline_plan" jsonb;
    ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "scope_plan" jsonb;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "quotes" DROP COLUMN IF EXISTS "intro";
    ALTER TABLE "quotes" DROP COLUMN IF EXISTS "timeline_plan";
    ALTER TABLE "quotes" DROP COLUMN IF EXISTS "scope_plan";
  `)
}
