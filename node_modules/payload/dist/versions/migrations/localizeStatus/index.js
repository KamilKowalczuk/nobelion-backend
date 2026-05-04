import { localizeStatus as mongoLocalizeStatus } from './mongo/index.js';
import { localizeStatus as sqlLocalizeStatus } from './sql/index.js';
/**
 * Main entry point for localizeStatus migration.
 * Detects database type and dispatches to appropriate implementation.
 */ export const localizeStatus = {
    async up (args) {
        // Detect database type by checking which parameters are present
        if ('db' in args && 'sql' in args) {
            // SQL database (Postgres, SQLite, etc.)
            return sqlLocalizeStatus.up(args);
        } else if ('payload' in args && !('db' in args)) {
            // MongoDB
            return mongoLocalizeStatus.up(args);
        } else {
            throw new Error('Unable to detect database type. Expected either { db, sql } for SQL databases ' + 'or { payload } for MongoDB.');
        }
    },
    async down (args) {
        // Detect database type by checking which parameters are present
        if ('db' in args && 'sql' in args) {
            // SQL database (Postgres, SQLite, etc.)
            return sqlLocalizeStatus.down(args);
        } else if ('payload' in args && !('db' in args)) {
            // MongoDB
            return mongoLocalizeStatus.down(args);
        } else {
            throw new Error('Unable to detect database type. Expected either { db, sql } for SQL databases ' + 'or { payload } for MongoDB.');
        }
    }
};

//# sourceMappingURL=index.js.map