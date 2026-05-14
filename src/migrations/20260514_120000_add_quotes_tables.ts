import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Tworzenie typów ENUM (jeśli nie istnieją)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_quotes_status" AS ENUM('draft', 'sent', 'accepted', 'rejected');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    
    DO $$ BEGIN
      CREATE TYPE "public"."enum_quotes_payment_status" AS ENUM('unpaid', 'paid_half', 'paid_full');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  // 2. Tworzenie tabeli Quotes
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "quotes" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "brief_id" integer NOT NULL,
      "status" "enum_quotes_status" DEFAULT 'draft',
      "quote_token" varchar,
      "total_price" numeric NOT NULL,
      "maintenance_price" numeric,
      "maintenance_description" varchar,
      "client_selected_maintenance" boolean DEFAULT false,
      "payment_status" "enum_quotes_payment_status" DEFAULT 'unpaid',
      "order_id_id" integer,
      "quote_sent_at" timestamp(3) with time zone,
      "action_send_quote" boolean,
      "action_send_subscription" boolean,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  // 3. Tworzenie tabel bloków
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "quotes_blocks_rich_text" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "text" jsonb,
      "block_name" varchar
    );
    
    CREATE TABLE IF NOT EXISTS "quotes_blocks_timeline" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "phase_name" varchar NOT NULL,
      "description" varchar,
      "block_name" varchar
    );
  `)

  // 4. Dodanie kolumny quotes_id do payload_locked_documents_rels (jeśli nie istnieje)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "quotes_id" integer;
  `)

  // 5. Indeksy
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "quotes_brief_idx" ON "quotes" USING btree ("brief_id");
    CREATE INDEX IF NOT EXISTS "quotes_order_id_idx" ON "quotes" USING btree ("order_id_id");
    CREATE INDEX IF NOT EXISTS "quotes_updated_at_idx" ON "quotes" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "quotes_created_at_idx" ON "quotes" USING btree ("created_at");
    
    CREATE INDEX IF NOT EXISTS "quotes_blocks_rich_text_order_idx" ON "quotes_blocks_rich_text" ("_order");
    CREATE INDEX IF NOT EXISTS "quotes_blocks_rich_text_parent_id_idx" ON "quotes_blocks_rich_text" ("_parent_id");
    
    CREATE INDEX IF NOT EXISTS "quotes_blocks_timeline_order_idx" ON "quotes_blocks_timeline" ("_order");
    CREATE INDEX IF NOT EXISTS "quotes_blocks_timeline_parent_id_idx" ON "quotes_blocks_timeline" ("_parent_id");
  `)

  // 6. Klucze obce
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "quotes" ADD CONSTRAINT "quotes_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "quotes" ADD CONSTRAINT "quotes_order_id_id_orders_id_fk" FOREIGN KEY ("order_id_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "quotes_blocks_rich_text" ADD CONSTRAINT "quotes_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "quotes_blocks_timeline" ADD CONSTRAINT "quotes_blocks_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "quotes_blocks_rich_text" CASCADE;
    DROP TABLE IF EXISTS "quotes_blocks_timeline" CASCADE;
    DROP TABLE IF EXISTS "quotes" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_quotes_status";
    DROP TYPE IF EXISTS "public"."enum_quotes_payment_status";
  `)
}
