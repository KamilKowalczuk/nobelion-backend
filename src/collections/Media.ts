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
        // Załączniki briefów = poufne dokumenty klientów. Odczyt i upload tylko z auth
        // (frontend /api/brief uderza z kluczem API → traktowany jako zalogowany user).
        read: ({ req: { user } }) => !!user,
        create: ({ req: { user } }) => !!user,
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
