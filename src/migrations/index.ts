import * as migration_20260505_112538 from './20260505_112538';
import * as migration_20260507_064356_add_pricing_to_briefs from './20260507_064356_add_pricing_to_briefs';
import * as migration_20260507_065700_sync_brief_fields from './20260507_065700_sync_brief_fields';
import * as migration_20260507_094800_users_apikey_and_briefs_rename from './20260507_094800_users_apikey_and_briefs_rename';

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
];
