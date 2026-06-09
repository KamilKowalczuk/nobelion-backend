import * as migration_20260505_112538 from './20260505_112538';
import * as migration_20260507_064356_add_pricing_to_briefs from './20260507_064356_add_pricing_to_briefs';
import * as migration_20260507_065700_sync_brief_fields from './20260507_065700_sync_brief_fields';
import * as migration_20260507_094800_users_apikey_and_briefs_rename from './20260507_094800_users_apikey_and_briefs_rename';
import * as migration_20260507_110600_fix_enums from './20260507_110600_fix_enums';
import * as migration_20260514_094500_fix_quote_enums from './20260514_094500_fix_quote_enums';
import * as migration_20260514_100900_add_quote_columns from './20260514_100900_add_quote_columns';
import * as migration_20260514_104400_project_plan_to_textarea from './20260514_104400_project_plan_to_textarea';

import * as migration_20260514_120000_add_quotes_tables from './20260514_120000_add_quotes_tables';
import * as migration_20260609_140000_quotes_richtext_columns from './20260609_140000_quotes_richtext_columns';

export const migrations = [
  {
    up: migration_20260505_112538.up,
    down: migration_20260505_112538.down,
    name: '20260505_112538',
  },
  {
    up: migration_20260507_064356_add_pricing_to_briefs.up,
    down: migration_20260507_064356_add_pricing_to_briefs.down,
    name: '20260507_064356_add_pricing_to_briefs'
  },
  {
    up: migration_20260507_065700_sync_brief_fields.up,
    down: migration_20260507_065700_sync_brief_fields.down,
    name: '20260507_065700_sync_brief_fields'
  },
  {
    up: migration_20260507_094800_users_apikey_and_briefs_rename.up,
    down: migration_20260507_094800_users_apikey_and_briefs_rename.down,
    name: '20260507_094800_users_apikey_and_briefs_rename'
  },
  {
    up: migration_20260507_110600_fix_enums.up,
    down: migration_20260507_110600_fix_enums.down,
    name: '20260507_110600_fix_enums'
  },
  {
    up: migration_20260514_094500_fix_quote_enums.up,
    down: migration_20260514_094500_fix_quote_enums.down,
    name: '20260514_094500_fix_quote_enums'
  },
  {
    up: migration_20260514_100900_add_quote_columns.up,
    down: migration_20260514_100900_add_quote_columns.down,
    name: '20260514_100900_add_quote_columns'
  },
  {
    up: migration_20260514_104400_project_plan_to_textarea.up,
    down: migration_20260514_104400_project_plan_to_textarea.down,
    name: '20260514_104400_project_plan_to_textarea'
  },
  {
    up: migration_20260514_120000_add_quotes_tables.up,
    down: migration_20260514_120000_add_quotes_tables.down,
    name: '20260514_120000_add_quotes_tables'
  },
  {
    up: migration_20260609_140000_quotes_richtext_columns.up,
    down: migration_20260609_140000_quotes_richtext_columns.down,
    name: '20260609_140000_quotes_richtext_columns'
  },
];
