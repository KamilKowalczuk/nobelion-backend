import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "diagnosis" varchar;
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "industry" varchar;
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "size" varchar;
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "tools" varchar;
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "grows_with_scale" varchar;
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "tried_before" jsonb;
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "tried_notes" varchar;
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "scope" varchar;
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "timeline";
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "diagnosis";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "industry";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "size";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "tools";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "grows_with_scale";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "tried_before";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "tried_notes";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "scope";
    ALTER TABLE "briefs" ADD COLUMN "timeline" varchar;
  `)
}
