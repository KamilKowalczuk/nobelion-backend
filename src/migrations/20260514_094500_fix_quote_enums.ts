import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Funkcja pomocnicza do bezpiecznego dodawania wartości do ENUM
    DO $$ 
    BEGIN
      -- Status
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_briefs_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_briefs_status' AND e.enumlabel = 'change_requested') THEN
          EXECUTE 'ALTER TYPE "enum_briefs_status" ADD VALUE ''change_requested''';
        END IF;
      END IF;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // W PostgreSQL nie można łatwo usunąć pojedynczej wartości z ENUM
}
