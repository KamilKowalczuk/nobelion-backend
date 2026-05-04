type LocalizeStatusMigration = {
    down: (args: any) => Promise<void>;
    up: (args: any) => Promise<void>;
};
/**
 * Main entry point for localizeStatus migration.
 * Detects database type and dispatches to appropriate implementation.
 */
export declare const localizeStatus: LocalizeStatusMigration;
export type { LocalizeStatusArgs as MongoLocalizeStatusArgs } from './mongo/index.js';
export type { LocalizeStatusArgs as SqlLocalizeStatusArgs } from './sql/index.js';
//# sourceMappingURL=index.d.ts.map