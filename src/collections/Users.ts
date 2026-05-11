import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
    slug: 'users',
    auth: {
        useAPIKey: true, // Włącza generowanie kluczy API w panelu admina
    },
    admin: {
        useAsTitle: 'email'
    },
    labels: {
        singular: 'Użytkownik',
        plural: 'Użytkownicy',
    },
    access: {
        read: ({ req: { user } }) => !!user,
        create: ({ req: { user } }) => !!user,
        update: ({ req: { user } }) => !!user,
        delete: ({ req: { user } }) => !!user,
        admin: ({ req: { user } }) => !!user,
    },
    fields: [
        {
            name: 'role',
            type: 'select',
            label: 'Rola',
            defaultValue: 'admin',
            options: [
                { label: 'Administrator', value: 'admin' },
                { label: 'API (Frontend)', value: 'api' },
            ],
        },
    ]
};
