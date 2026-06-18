import type { CollectionConfig } from 'payload';

// Niezmienne archiwum wersji dokumentów. Każda zmiana treści w `documents`
// tworzy tu snapshot (pełna treść + hash). Dzięki temu zawsze można odtworzyć
// DOKŁADNIE tę wersję dokumentu, którą zaakceptował klient (ślad audytowy).
// Zapis wyłącznie systemowy (hook z overrideAccess); bez edycji = niezmienne.
export const DocumentVersions: CollectionConfig = {
    slug: 'document-versions',
    admin: {
        useAsTitle: 'label',
        defaultColumns: ['label', 'docType', 'version', 'contentHash', 'createdAt'],
        description: 'Archiwum wersji dokumentów — niezmienne, tworzone automatycznie przy każdej zmianie treści.',
    },
    labels: { singular: 'Wersja dokumentu', plural: 'Archiwum wersji dokumentów' },
    access: {
        read: ({ req: { user } }) => !!user,
        create: () => false,   // tylko hook (overrideAccess)
        update: ({ req: { user } }) => !!user, // Obejście błędu Payload UI (infinite load) - i tak wszystkie pola mają readOnly: true
        delete: ({ req: { user } }) => !!user, 
    },
    fields: [
        { name: 'label', type: 'text', label: 'Etykieta', admin: { readOnly: true } },
        { name: 'docType', type: 'text', label: 'Rodzaj dokumentu', admin: { readOnly: true } },
        { name: 'version', type: 'text', label: 'Wersja', admin: { readOnly: true } },
        { name: 'title', type: 'text', label: 'Tytuł', admin: { readOnly: true } },
        { name: 'content', type: 'textarea', label: 'Treść (snapshot)', admin: { readOnly: true, rows: 20 } },
        { name: 'contentHash', type: 'text', label: 'Hash treści (SHA-256)', admin: { readOnly: true } },
    ],
    timestamps: true,
};
