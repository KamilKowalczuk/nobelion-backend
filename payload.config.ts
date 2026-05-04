import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { Briefs } from './src/collections/Briefs';
import { Orders } from './src/collections/Orders';
import { Users } from './src/collections/Users';

export default buildConfig({
    secret: process.env.PAYLOAD_SECRET || 'replace-me',
    collections: [Users, Briefs, Orders],
    db: postgresAdapter({
        pool: {
            connectionString: process.env.DATABASE_URI
        }
    }),
    admin: {
        user: 'users'
    }
});
