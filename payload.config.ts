import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import {
    BoldFeature,
    ItalicFeature,
    LinkFeature,
    ParagraphFeature,
    lexicalEditor,
    UnderlineFeature,
    HeadingFeature,
    OrderedListFeature,
    UnorderedListFeature,
} from '@payloadcms/richtext-lexical';
import { Briefs } from './src/collections/Briefs';
import { Orders } from './src/collections/Orders';
import { Users } from './src/collections/Users';
import { Quotes } from './src/collections/Quotes';
import { Media } from './src/collections/Media';

export default buildConfig({
    editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
            ...defaultFeatures,
            ParagraphFeature(),
            BoldFeature(),
            ItalicFeature(),
            UnderlineFeature(),
            LinkFeature({}),
            HeadingFeature({}),
            OrderedListFeature(),
            UnorderedListFeature(),
        ],
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
        } catch (err) {
            console.error('[Nobelion CMS] Błąd podczas auto-naprawy bazy danych:', err);
        }
    },
    secret: process.env.PAYLOAD_SECRET || 'replace-me',
    cors: ['https://nobelion.pl', 'https://www.nobelion.pl', 'https://admin.nobelion.pl', 'http://localhost:4321', 'http://localhost:3000', 'http://localhost:3001'],
    csrf: ['https://nobelion.pl', 'https://www.nobelion.pl', 'https://admin.nobelion.pl', 'http://localhost:4321', 'http://localhost:3000', 'http://localhost:3001'],
    collections: [Users, Briefs, Orders, Quotes, Media],
    db: postgresAdapter({
        pool: {
            connectionString: process.env.DATABASE_URI
        },
        push: true
    }),
    admin: {
        user: 'users'
    }
});
