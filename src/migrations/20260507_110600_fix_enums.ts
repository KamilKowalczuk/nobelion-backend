import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Funkcja pomocnicza do bezpiecznego dodawania wartości do ENUM
    DO $$ 
    BEGIN
      -- Urgency
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_urgency' AND e.enumlabel = 'rozwazam') THEN
        ALTER TYPE "enum_briefs_urgency" ADD VALUE 'rozwazam';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_urgency' AND e.enumlabel = 'palace') THEN
        ALTER TYPE "enum_briefs_urgency" ADD VALUE 'palace';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_urgency' AND e.enumlabel = 'miesiac') THEN
        ALTER TYPE "enum_briefs_urgency" ADD VALUE 'miesiac';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_urgency' AND e.enumlabel = 'kwartal') THEN
        ALTER TYPE "enum_briefs_urgency" ADD VALUE 'kwartal';
      END IF;

      -- Scope
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_scope' AND e.enumlabel = 'doradzcie') THEN
        ALTER TYPE "enum_briefs_scope" ADD VALUE 'doradzcie';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_scope' AND e.enumlabel = 'mvp') THEN
        ALTER TYPE "enum_briefs_scope" ADD VALUE 'mvp';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_scope' AND e.enumlabel = 'pelny') THEN
        ALTER TYPE "enum_briefs_scope" ADD VALUE 'pelny';
      END IF;

      -- Diagnosis
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_diagnosis' AND e.enumlabel = 'biuro') THEN
        ALTER TYPE "enum_briefs_diagnosis" ADD VALUE 'biuro';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_diagnosis' AND e.enumlabel = 'strona') THEN
        ALTER TYPE "enum_briefs_diagnosis" ADD VALUE 'strona';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_diagnosis' AND e.enumlabel = 'sprzedaz') THEN
        ALTER TYPE "enum_briefs_diagnosis" ADD VALUE 'sprzedaz';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_diagnosis' AND e.enumlabel = 'wizja') THEN
        ALTER TYPE "enum_briefs_diagnosis" ADD VALUE 'wizja';
      END IF;

      -- Status
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_status' AND e.enumlabel = 'quoted') THEN
        ALTER TYPE "enum_briefs_status" ADD VALUE 'quoted';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_status' AND e.enumlabel = 'won') THEN
        ALTER TYPE "enum_briefs_status" ADD VALUE 'won';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_status' AND e.enumlabel = 'lost') THEN
        ALTER TYPE "enum_briefs_status" ADD VALUE 'lost';
      END IF;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // W Postgres nie można łatwo usunąć wartości z ENUM.
}
