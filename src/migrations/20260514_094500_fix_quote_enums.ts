import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * KOMPLETNA MIGRACJA SCHEMATOWA — „raz a dobrze"
 * 
 * Dodaje WSZYSTKIE kolumny i wartości ENUM, których może brakować
 * w bazie produkcyjnej po rozbudowie kolekcji Briefs o:
 * - projectPlan (richText → jsonb)
 * - monthlyMaintenancePrice (number)
 * - maintenanceDescription (textarea)
 * - changeRequests (array → osobna tabela)
 * - status: change_requested (enum)
 * 
 * KAŻDY blok jest idempotentny (IF NOT EXISTS / IF EXISTS).
 * Można uruchomić wielokrotnie bez ryzyka błędu.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // ─── 1. ENUM: dodanie brakujących wartości ────────────────────────
  await db.execute(sql`
    DO $$ BEGIN
      -- Status: change_requested
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_briefs_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                       WHERE t.typname = 'enum_briefs_status' AND e.enumlabel = 'change_requested') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_status" ADD VALUE ''change_requested''';
        END IF;
      END IF;
    END $$;
  `)

  // ─── 2. Kolumny w tabeli briefs ───────────────────────────────────
  await db.execute(sql`
    -- projectPlan (richText = JSONB w Payload v3)
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'briefs' AND column_name = 'project_plan') THEN
        ALTER TABLE "briefs" ADD COLUMN "project_plan" jsonb;
      END IF;
    END $$;

    -- monthlyMaintenancePrice (numeric)
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'briefs' AND column_name = 'monthly_maintenance_price') THEN
        ALTER TABLE "briefs" ADD COLUMN "monthly_maintenance_price" numeric;
      END IF;
    END $$;

    -- maintenanceDescription (varchar/text)
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'briefs' AND column_name = 'maintenance_description') THEN
        ALTER TABLE "briefs" ADD COLUMN "maintenance_description" varchar;
      END IF;
    END $$;
  `)

  // ─── 3. Tabela changeRequests (Payload array → osobna tabela) ─────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "briefs_change_requests" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "message" varchar,
      "date" timestamp(3) with time zone
    );

    -- Indeks na foreign key (parent)
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'briefs_change_requests_order_idx') THEN
        CREATE INDEX "briefs_change_requests_order_idx" ON "briefs_change_requests" ("_order");
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'briefs_change_requests_parent_id_idx') THEN
        CREATE INDEX "briefs_change_requests_parent_id_idx" ON "briefs_change_requests" ("_parent_id");
      END IF;
    END $$;

    -- Foreign key constraint (jeśli nie istnieje)
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                     WHERE constraint_name = 'briefs_change_requests_parent_id_fk'
                       AND table_name = 'briefs_change_requests') THEN
        ALTER TABLE "briefs_change_requests"
          ADD CONSTRAINT "briefs_change_requests_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "briefs"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "briefs_change_requests";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "project_plan";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "monthly_maintenance_price";
    ALTER TABLE "briefs" DROP COLUMN IF EXISTS "maintenance_description";
  `)
}
