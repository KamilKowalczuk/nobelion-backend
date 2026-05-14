import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Urgency
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_briefs_urgency') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_urgency' AND e.enumlabel = 'rozwazam') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_urgency" ADD VALUE ''rozwazam''';
        END IF;
      END IF;
    END $$;

    -- Scope
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_briefs_scope') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_scope' AND e.enumlabel = 'doradzcie') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_scope" ADD VALUE ''doradzcie''';
        END IF;
      END IF;
    END $$;

    -- Diagnosis
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_briefs_diagnosis') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_diagnosis' AND e.enumlabel = 'biuro') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_diagnosis" ADD VALUE ''biuro''';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_diagnosis' AND e.enumlabel = 'strona') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_diagnosis" ADD VALUE ''strona''';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_diagnosis' AND e.enumlabel = 'sprzedaz') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_diagnosis" ADD VALUE ''sprzedaz''';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_diagnosis' AND e.enumlabel = 'wizja') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_diagnosis" ADD VALUE ''wizja''';
        END IF;
      END IF;
    END $$;

    -- Status
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_briefs_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_status' AND e.enumlabel = 'quoted') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_status" ADD VALUE ''quoted''';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_status' AND e.enumlabel = 'won') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_status" ADD VALUE ''won''';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_status' AND e.enumlabel = 'lost') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_status" ADD VALUE ''lost''';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_status' AND e.enumlabel = 'change_requested') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_status" ADD VALUE ''change_requested''';
        END IF;
      END IF;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {}
