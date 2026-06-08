import type { CollectionConfig } from 'payload';

export const Media: CollectionConfig = {
    slug: 'media',
    admin: {
        useAsTitle: 'filename',
        defaultColumns: ['filename', 'mimeType', 'filesize', 'createdAt'],
    },
    labels: {
        singular: 'Plik',
        plural: 'Pliki',
    },
    access: {
        read: () => true,
        create: () => true,
        update: ({ req: { user } }) => !!user,
        delete: ({ req: { user } }) => !!user,
    },
    upload: {
        staticDir: 'media',
        adminThumbnail: 'thumbnail',
        displayPreview: true,
        mimeTypes: ['image/*', 'application/pdf'],
        imageSizes: [
            {
                name: 'thumbnail',
                width: 320,
                height: 240,
                position: 'centre',
            },
        ],
    },
    fields: [
        {
            name: 'alt',
            type: 'text',
            label: 'Opis pliku',
        },
    ],
};
