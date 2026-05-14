import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { Briefs } from './src/collections/Briefs';
import { Orders } from './src/collections/Orders';
import { Users } from './src/collections/Users';
import { Quotes } from './src/collections/Quotes';

export default buildConfig({
    editor: lexicalEditor({}),
    secret: process.env.PAYLOAD_SECRET || 'replace-me',
    cors: ['https://nobelion.pl', 'https://www.nobelion.pl', 'https://admin.nobelion.pl', 'http://localhost:4321', 'http://localhost:3000', 'http://localhost:3001'],
    csrf: ['https://nobelion.pl', 'https://www.nobelion.pl', 'https://admin.nobelion.pl', 'http://localhost:4321', 'http://localhost:3000', 'http://localhost:3001'],
    collections: [Users, Briefs, Orders, Quotes],
    db: postgresAdapter({
        pool: {
            connectionString: process.env.DATABASE_URI
        },
        push: false
    }),
    admin: {
        user: 'users'
    }
});
