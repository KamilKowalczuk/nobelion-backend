import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "briefs" ADD COLUMN "proposed_price" numeric;
  ALTER TABLE "briefs" ADD COLUMN "trigger_quote_email" boolean;
  ALTER TABLE "briefs" ADD COLUMN "quote_sent_at" timestamp(3) with time zone;
  ALTER TABLE "briefs" ADD COLUMN "quote_token" varchar;
  CREATE UNIQUE INDEX "briefs_quote_token_idx" ON "briefs" USING btree ("quote_token");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "briefs_quote_token_idx";
  ALTER TABLE "briefs" DROP COLUMN "proposed_price";
  ALTER TABLE "briefs" DROP COLUMN "trigger_quote_email";
  ALTER TABLE "briefs" DROP COLUMN "quote_sent_at";
  ALTER TABLE "briefs" DROP COLUMN "quote_token";`)
}
