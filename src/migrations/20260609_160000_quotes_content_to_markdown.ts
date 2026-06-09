import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Konwersja kolumn treści wyceny z jsonb (Lexical) → varchar (Markdown).
 * Pola intro/timeline_plan/scope_plan są teraz polami textarea (Markdown).
 * Stara treść Lexical (JSON) nie konwertuje się czysto na Markdown, więc kolumny
 * są czyszczone (NULL) — treść testową wpisuje się ponownie w Markdown.
 * Konwertujemy tylko gdy kolumna jest typu jsonb (idempotentne — varchar pomijamy).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const col of ['intro', 'timeline_plan', 'scope_plan']) {
    await db.execute(sql.raw(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'quotes' AND column_name = '${col}' AND data_type = 'jsonb') THEN
          ALTER TABLE "quotes" ALTER COLUMN "${col}" TYPE varchar USING NULL::varchar;
        END IF;
      END $$;
    `))
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Brak rollbacku — konwersja Markdown → jsonb nie ma sensu (utrata struktury).
}
