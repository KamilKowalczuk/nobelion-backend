import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Dodaje brakujące kolumny do tabeli briefs:
 * - project_plan (jsonb) — Rich Text plan prac
 * - monthly_maintenance_price (numeric) — kwota utrzymania
 * - maintenance_description (varchar) — opis utrzymania
 * 
 * Oraz tworzy tabelę briefs_change_requests dla tablicy prób zmian.
 * 
 * WSZYSTKO jest idempotentne (IF NOT EXISTS).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Kolumny w tabeli briefs
  await db.execute(sql`
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "project_plan" jsonb
  `)
  await db.execute(sql`
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "monthly_maintenance_price" numeric
  `)
  await db.execute(sql`
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "maintenance_description" varchar
  `)

  // Tabela changeRequests (Payload array → osobna tabela)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "briefs_change_requests" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "message" varchar,
      "date" timestamp(3) with time zone
    )
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "briefs_change_requests_order_idx" ON "briefs_change_requests" ("_order")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "briefs_change_requests_parent_id_idx" ON "briefs_change_requests" ("_parent_id")
  `)
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                     WHERE constraint_name = 'briefs_change_requests_parent_id_fk'
                       AND table_name = 'briefs_change_requests') THEN
        ALTER TABLE "briefs_change_requests"
          ADD CONSTRAINT "briefs_change_requests_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "briefs"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "briefs_change_requests"`)
  await db.execute(sql`ALTER TABLE "briefs" DROP COLUMN IF EXISTS "project_plan"`)
  await db.execute(sql`ALTER TABLE "briefs" DROP COLUMN IF EXISTS "monthly_maintenance_price"`)
  await db.execute(sql`ALTER TABLE "briefs" DROP COLUMN IF EXISTS "maintenance_description"`)
}
