import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Postgres nie pozwala na ADD VALUE wewnątrz transakcji w niektórych wersjach, 
  // ale Payload 3 i PG 12+ zazwyczaj na to pozwalają jeśli używamy odpowiedniej składni.
  // Używamy bezpiecznego podejścia - dodajemy wartości jeśli ich nie ma.
  
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "enum_briefs_urgency" ADD VALUE 'rozwazam';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    
    DO $$ BEGIN
      ALTER TYPE "enum_briefs_scope" ADD VALUE 'doradzcie';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TYPE "enum_briefs_diagnosis" ADD VALUE 'biuro';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TYPE "enum_briefs_diagnosis" ADD VALUE 'strona';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TYPE "enum_briefs_diagnosis" ADD VALUE 'sprzedaz';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TYPE "enum_briefs_diagnosis" ADD VALUE 'wizja';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // W Postgres nie można łatwo usunąć wartości z ENUM, 
  // ale w dół zazwyczaj nie musimy nic robić przy dodawaniu wartości.
}
