import type { CollectionConfig } from 'payload';

export const Media: CollectionConfig = {
    slug: 'media',
    labels: {
        singular: 'Plik',
        plural: 'Pliki',
    },
    access: {
        read: ({ req: { user } }) => !!user,
        create: ({ req: { user } }) => !!user,
        update: ({ req: { user } }) => !!user,
        delete: ({ req: { user } }) => !!user,
    },
    upload: {
        staticDir: 'media',
        mimeTypes: ['image/*', 'application/pdf'],
    },
    fields: [
        {
            name: 'alt',
            type: 'text',
            label: 'Opis pliku',
        },
    ],
};
