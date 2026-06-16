import type { CollectionConfig } from 'payload';
import crypto from 'crypto';

// Dokumenty prawne (regulamin, polityka, RODO, umowa współpracy) — źródło prawdy.
// Treść w Markdown (jak wyceny). Każdy zapis liczy hash treści + bije wersję —
// to fundament śladu audytowego clickwrap (na co dokładnie klient się zgodził).
export const Documents: CollectionConfig = {
    slug: 'documents',
    admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'docType', 'version', 'updatedAt'],
        description: 'Dokumenty prawne pokazywane klientom. Edycja treści automatycznie podbija wersję i hash.',
    },
    labels: { singular: 'Dokument', plural: 'Dokumenty' },
    access: {
        // Admin zarządza; klient czyta wyłącznie przez publiczny endpoint /public (whitelist).
        read: ({ req: { user } }) => !!user,
        create: ({ req: { user } }) => !!user,
        update: ({ req: { user } }) => !!user,
        delete: ({ req: { user } }) => !!user,
    },
    fields: [
        {
            name: 'docType',
            type: 'select',
            label: 'Rodzaj dokumentu',
            required: true,
            unique: true,
            options: [
                { label: 'Umowa współpracy', value: 'umowa-wspolpracy' },
                { label: 'Regulamin serwisu', value: 'regulamin' },
                { label: 'Polityka prywatności', value: 'polityka-prywatnosci' },
                { label: 'Klauzula RODO', value: 'rodo' },
            ],
            admin: { description: 'Jeden dokument na rodzaj (unikalny).' },
        },
        { name: 'title', type: 'text', label: 'Tytuł', required: true },
        {
            name: 'content',
            type: 'textarea',
            label: 'Treść (Markdown)',
            required: true,
            admin: {
                rows: 24,
                description: 'Markdown: **pogrubienie**, ## nagłówek, - lista, [link](https://...). Pusta linia = nowy akapit.',
            },
        },
        {
            name: 'version',
            type: 'text',
            label: 'Wersja',
            admin: { readOnly: true, description: 'Auto: rośnie przy każdej zmianie treści.' },
        },
        {
            name: 'contentHash',
            type: 'text',
            label: 'Hash treści (SHA-256)',
            admin: { readOnly: true, description: 'Odcisk treści — dowód, na jaką wersję zgodził się klient.' },
        },
    ],
    hooks: {
        beforeChange: [
            ({ data, originalDoc }) => {
                if (typeof data.content !== 'string') return data;
                const hash = crypto.createHash('sha256').update(data.content, 'utf8').digest('hex');
                // Podbij wersję tylko gdy treść faktycznie się zmieniła.
                if (!originalDoc || originalDoc.contentHash !== hash) {
                    const prev = parseInt((originalDoc?.version || '0').replace(/[^\d]/g, ''), 10) || 0;
                    data.version = `${prev + 1}`;
                    data.contentHash = hash;
                }
                return data;
            },
        ],
    },
    endpoints: [
        {
            // Publiczny odczyt dokumentów dla strony wyceny (whitelist, bez auth).
            path: '/public',
            method: 'get',
            handler: async (req) => {
                const docs = await req.payload.find({
                    collection: 'documents',
                    limit: 20,
                    depth: 0,
                });
                const out = docs.docs.map((d: any) => ({
                    docType: d.docType,
                    title: d.title,
                    version: d.version || '1',
                    contentHash: d.contentHash || '',
                    content: d.content || '',
                }));
                return Response.json({ documents: out });
            },
        },
    ],
    timestamps: true,
};
