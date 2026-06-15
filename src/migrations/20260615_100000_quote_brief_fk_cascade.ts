import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Naprawa kasowania briefów z powiązaną wyceną.
 *
 * FK quotes.brief_id -> briefs(id) miał ON DELETE SET NULL, podczas gdy kolumna
 * quotes.brief_id jest NOT NULL. Usunięcie briefu z wyceną wywoływało próbę
 * SET NULL → naruszenie NOT NULL → "current transaction is aborted" (a w logu
 * widać dopiero kolejne, niewinne zapytanie na payload_preferences).
 *
 * Wycena bez briefu nie ma sensu (pole 'brief' jest required, czyta z niego
 * dane klienta), więc poprawna relacja to CASCADE: kasujemy brief → znika też
 * jego wycena. Zamówienia (orders) mają własny snapshot rozliczeniowy i FK
 * SET NULL, więc przetrwają nietknięte.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'quotes_brief_id_briefs_id_fk'
          AND table_name = 'quotes'
      ) THEN
        ALTER TABLE "quotes" DROP CONSTRAINT "quotes_brief_id_briefs_id_fk";
      END IF;

      ALTER TABLE "quotes"
        ADD CONSTRAINT "quotes_brief_id_briefs_id_fk"
        FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END $$;
  `))
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Przywraca poprzedni (wadliwy) wariant SET NULL — tylko dla symetrii rollbacku.
  await db.execute(sql.raw(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'quotes_brief_id_briefs_id_fk'
          AND table_name = 'quotes'
      ) THEN
        ALTER TABLE "quotes" DROP CONSTRAINT "quotes_brief_id_briefs_id_fk";
      END IF;

      ALTER TABLE "quotes"
        ADD CONSTRAINT "quotes_brief_id_briefs_id_fk"
        FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    END $$;
  `))
}
