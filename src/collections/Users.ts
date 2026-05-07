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
