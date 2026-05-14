import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Zmiana kolumny project_plan z jsonb (richText) na varchar (textarea).
 * Kolumna jest pusta (null) więc nie tracimy danych.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "project_plan"
  `)
  await db.execute(sql`
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "project_plan" varchar
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "project_plan"
  `)
  await db.execute(sql`
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "project_plan" jsonb
  `)
}
