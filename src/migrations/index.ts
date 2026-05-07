import * as migration_20260505_112538 from './20260505_112538';
import * as migration_20260507_064356_add_pricing_to_briefs from './20260507_064356_add_pricing_to_briefs';

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
];
