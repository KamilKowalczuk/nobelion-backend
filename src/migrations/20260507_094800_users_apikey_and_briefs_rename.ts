import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar DEFAULT 'admin';
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "enable_a_p_i_key" boolean;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "api_key" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "api_key_index" varchar;
    CREATE INDEX IF NOT EXISTS "users_api_key_idx" ON "users" USING btree ("api_key_index");
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "client_name" varchar;
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "client_email" varchar;
    UPDATE "briefs" SET "client_name" = "name" WHERE "client_name" IS NULL AND "name" IS NOT NULL;
    UPDATE "briefs" SET "client_email" = "email" WHERE "client_email" IS NULL AND "email" IS NOT NULL;
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "name";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "email";
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "name" varchar;
    ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "email" varchar;
    UPDATE "briefs" SET "name" = "client_name" WHERE "name" IS NULL AND "client_name" IS NOT NULL;
    UPDATE "briefs" SET "email" = "client_email" WHERE "email" IS NULL AND "client_email" IS NOT NULL;
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "client_name";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "client_email";
    DROP INDEX IF EXISTS "users_api_key_idx";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "enable_a_p_i_key";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "api_key";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "api_key_index";
  `)
}
