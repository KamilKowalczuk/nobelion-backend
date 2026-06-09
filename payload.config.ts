import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { Briefs } from './src/collections/Briefs';
import { Orders } from './src/collections/Orders';
import { Users } from './src/collections/Users';
import { Quotes } from './src/collections/Quotes';
import { Media } from './src/collections/Media';

// Origins produkcyjne zawsze; localhost tylko poza produkcją (dev).
const isProd = process.env.NODE_ENV === 'production';

// Fail-closed: w produkcji nie wolno wystartować ze słabym/domyślnym sekretem JWT.
const payloadSecret = process.env.PAYLOAD_SECRET;
if (isProd && (!payloadSecret || payloadSecret === 'replace-me' || payloadSecret.length < 24)) {
    throw new Error('[Nobelion CMS] PAYLOAD_SECRET musi być ustawiony (min. 24 znaki) w produkcji.');
}
const allowedOrigins = [
    'https://nobelion.pl',
    'https://www.nobelion.pl',
    'https://admin.nobelion.pl',
    ...(isProd ? [] : ['http://localhost:4321', 'http://localhost:3000', 'http://localhost:3001']),
];

export default buildConfig({
    editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures],
    }),
    onInit: async (payload) => {
        try {
            const { sql } = await import('@payloadcms/db-postgres');
            await (payload.db as any).drizzle.execute(sql`
                DO $$ BEGIN
                    CREATE TYPE "public"."enum_briefs_labor_rate" AS ENUM('low', 'mid', 'high');
                EXCEPTION WHEN duplicate_object THEN null; END $$;

                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'briefs') THEN
                        ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "labor_rate" "public"."enum_briefs_labor_rate" DEFAULT 'mid';
                        UPDATE "briefs" SET "labor_rate" = 'mid' WHERE "labor_rate" IS NULL;
                    END IF;
                END $$;

                CREATE TABLE IF NOT EXISTS "media" (
                    "id" serial PRIMARY KEY,
                    "alt" varchar,
                    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
                    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
                    "url" varchar,
                    "thumbnail_u_r_l" varchar,
                    "filename" varchar,
                    "mime_type" varchar,
                    "filesize" numeric,
                    "width" numeric,
                    "height" numeric,
                    "focal_x" numeric,
                    "focal_y" numeric
                );

                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "alt" varchar;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "url" varchar;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "thumbnail_u_r_l" varchar;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "filename" varchar;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "mime_type" varchar;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "filesize" numeric;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "width" numeric;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "height" numeric;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "focal_x" numeric;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "focal_y" numeric;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_url" varchar;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_width" numeric;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_height" numeric;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_mime_type" varchar;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_filesize" numeric;
                ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_filename" varchar;

                CREATE INDEX IF NOT EXISTS "media_filename_idx" ON "media" ("filename");
                CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" ("created_at");
                CREATE INDEX IF NOT EXISTS "media_updated_at_idx" ON "media" ("updated_at");

                CREATE TABLE IF NOT EXISTS "briefs_rels" (
                    "id" serial PRIMARY KEY,
                    "order" integer,
                    "parent_id" integer NOT NULL,
                    "path" varchar NOT NULL,
                    "media_id" integer
                );

                CREATE INDEX IF NOT EXISTS "briefs_rels_parent_idx" ON "briefs_rels" ("parent_id");
                CREATE INDEX IF NOT EXISTS "briefs_rels_media_idx" ON "briefs_rels" ("media_id");

                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payload_locked_documents_rels') THEN
                        ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "media_id" integer;
                        CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_media_idx" ON "payload_locked_documents_rels" ("media_id");
                    END IF;
                END $$;

                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payload_preferences_rels') THEN
                        ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "media_id" integer;
                        CREATE INDEX IF NOT EXISTS "payload_preferences_rels_media_idx" ON "payload_preferences_rels" ("media_id");
                    END IF;
                END $$;
            `);
            await (payload.db as any).drizzle.execute(sql`
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_briefs_urgency') THEN
                        ALTER TYPE "public"."enum_briefs_urgency" ADD VALUE IF NOT EXISTS 'low';
                        ALTER TYPE "public"."enum_briefs_urgency" ADD VALUE IF NOT EXISTS 'medium';
                        ALTER TYPE "public"."enum_briefs_urgency" ADD VALUE IF NOT EXISTS 'high';
                        ALTER TYPE "public"."enum_briefs_urgency" ADD VALUE IF NOT EXISTS 'urgent';
                    END IF;
                END $$;

                DO $$ BEGIN
                    CREATE TYPE "public"."enum_quotes_status" AS ENUM('draft', 'sent', 'accepted', 'rejected');
                EXCEPTION WHEN duplicate_object THEN null; END $$;
                
                DO $$ BEGIN
                    CREATE TYPE "public"."enum_quotes_payment_status" AS ENUM('unpaid', 'paid_half', 'paid_full');
                EXCEPTION WHEN duplicate_object THEN null; END $$;

                CREATE TABLE IF NOT EXISTS "quotes" (
                    "id" serial PRIMARY KEY,
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
                    "subscription_sent_at" timestamp(3) with time zone,
                    "action_send_quote" boolean,
                    "action_send_subscription" boolean,
                    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
                    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
                );

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

                CREATE INDEX IF NOT EXISTS "quotes_brief_idx" ON "quotes" ("brief_id");
                ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "subscription_sent_at" timestamp(3) with time zone;

                DO $$ BEGIN
                    ALTER TABLE "quotes" ADD CONSTRAINT "quotes_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE SET NULL;
                EXCEPTION WHEN duplicate_object THEN null; END $$;

                DO $$ BEGIN
                    ALTER TABLE "quotes" ADD CONSTRAINT "quotes_order_id_id_orders_id_fk" FOREIGN KEY ("order_id_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;
                EXCEPTION WHEN duplicate_object THEN null; END $$;

                DO $$ BEGIN
                    ALTER TABLE "briefs_rels" ADD CONSTRAINT "briefs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."briefs"("id") ON DELETE CASCADE;
                EXCEPTION WHEN duplicate_object THEN null; END $$;

                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media') THEN
                        ALTER TABLE "briefs_rels" ADD CONSTRAINT "briefs_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE SET NULL;
                    END IF;
                EXCEPTION WHEN duplicate_object THEN null; END $$;

                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media')
                        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payload_locked_documents_rels') THEN
                        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;
                    END IF;
                EXCEPTION WHEN duplicate_object THEN null; END $$;

                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media')
                        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payload_preferences_rels') THEN
                        ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;
                    END IF;
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            `);
            console.log('[Nobelion CMS] Baza danych Briefs + Quotes + relacje zweryfikowane pomyślnie.');

            // ── Nowe tabele dla pól array w Quotes (bezpieczne, idempotentne) ──
            await (payload.db as any).drizzle.execute(sql`
                ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "intro" jsonb;
                ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "timeline_plan" jsonb;
                ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "scope_plan" jsonb;

                CREATE TABLE IF NOT EXISTS "quotes_timeline_phases" (
                    "_order" integer NOT NULL,
                    "_parent_id" integer NOT NULL,
                    "id" varchar PRIMARY KEY NOT NULL,
                    "phase_name" varchar NOT NULL,
                    "duration" varchar,
                    "description" varchar
                );
                CREATE INDEX IF NOT EXISTS "quotes_timeline_phases_order_idx"
                    ON "quotes_timeline_phases" USING btree ("_order");
                CREATE INDEX IF NOT EXISTS "quotes_timeline_phases_parent_idx"
                    ON "quotes_timeline_phases" USING btree ("_parent_id");
                DO $$ BEGIN
                    ALTER TABLE "quotes_timeline_phases" ADD CONSTRAINT "quotes_timeline_phases_parent_fk"
                        FOREIGN KEY ("_parent_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;
                EXCEPTION WHEN duplicate_object THEN null; END $$;

                CREATE TABLE IF NOT EXISTS "quotes_scope_items" (
                    "_order" integer NOT NULL,
                    "_parent_id" integer NOT NULL,
                    "id" varchar PRIMARY KEY NOT NULL,
                    "item" varchar NOT NULL,
                    "included" varchar DEFAULT 'included'
                );
                CREATE INDEX IF NOT EXISTS "quotes_scope_items_order_idx"
                    ON "quotes_scope_items" USING btree ("_order");
                CREATE INDEX IF NOT EXISTS "quotes_scope_items_parent_idx"
                    ON "quotes_scope_items" USING btree ("_parent_id");
                DO $$ BEGIN
                    ALTER TABLE "quotes_scope_items" ADD CONSTRAINT "quotes_scope_items_parent_fk"
                        FOREIGN KEY ("_parent_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;
                EXCEPTION WHEN duplicate_object THEN null; END $$;

                ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "client_label" varchar;
            `);
            console.log('[Nobelion CMS] Nowe tabele dla wycen (timeline, scope) gotowe.');
        } catch (err) {
            console.error('[Nobelion CMS] Błąd podczas auto-naprawy bazy danych:', err);
        }
    },
    secret: payloadSecret || 'dev-only-insecure-secret',
    cors: allowedOrigins,
    csrf: allowedOrigins,
    collections: [Users, Briefs, Orders, Quotes, Media],
    db: postgresAdapter({
        pool: {
            connectionString: process.env.DATABASE_URI
        },
        // push: false — schemat zarządzany migracjami (Docker CMD: `payload migrate`),
        // a idempotentny onInit gwarantuje obecność kolumn. push:true auto-modyfikował
        // schemat na podstawie diffu kodu (ryzyko utraty danych) — wyłączone.
        push: false,
        migrationDir: './src/migrations',
    }),
    admin: {
        user: 'users'
    }
});
