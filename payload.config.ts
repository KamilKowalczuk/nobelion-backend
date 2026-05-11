import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { Briefs } from './src/collections/Briefs';
import { Orders } from './src/collections/Orders';
import { Users } from './src/collections/Users';

export default buildConfig({
    secret: process.env.PAYLOAD_SECRET || 'replace-me',
    cors: ['https://nobelion.pl', 'https://www.nobelion.pl', 'https://admin.nobelion.pl', 'http://localhost:4321', 'http://localhost:3000', 'http://localhost:3001'],
    csrf: ['https://nobelion.pl', 'https://www.nobelion.pl', 'https://admin.nobelion.pl', 'http://localhost:4321', 'http://localhost:3000', 'http://localhost:3001'],
    collections: [Users, Briefs, Orders],
    db: postgresAdapter({
        pool: {
            connectionString: process.env.DATABASE_URI
        },
        push: true
    }),
    admin: {
        user: 'users'
    }
});
