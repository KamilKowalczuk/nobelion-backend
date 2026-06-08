import type { CollectionConfig } from 'payload';

export const Briefs: CollectionConfig = {
    slug: 'briefs',
    admin: {
        useAsTitle: 'clientLabel',
        defaultColumns: ['clientLabel', 'status', 'budget', 'urgency', 'createdAt']
    },
    labels: {
        singular: 'Brief',
        plural: 'Briefy',
    },
    access: {
        read: ({ req: { user } }) => !!user,
        create: () => true,
        update: ({ req: { user } }) => !!user,
        delete: ({ req: { user } }) => !!user,
    },
    hooks: {
        beforeChange: [
            ({ data }) => {
                const parts = [data.company, data.clientName, data.clientEmail].filter(Boolean);
                data.clientLabel = parts.join(' · ');
                return data;
            }
        ],
        beforeRead: [
            ({ doc }) => {
                if (!doc.clientLabel) {
                    const parts = [doc.company, doc.clientName, doc.clientEmail].filter(Boolean);
                    doc.clientLabel = parts.join(' · ');
                }
                return doc;
            }
        ]
    },
    fields: [
        // Auto-generowany label dla dropdownów (firma · imię · email)
        {
            name: 'clientLabel',
            type: 'text',
            admin: { hidden: true, readOnly: true, disableBulkEdit: true },
        },
        // --- Krok 1: Diagnoza ---
        {
            name: 'diagnosis',
            type: 'select',
            label: 'Diagnoza',
            options: [
                { label: 'Powtarzalna praca biurowa', value: 'biuro' },
                { label: 'Strona nie sprzedaje', value: 'strona' },
                { label: 'Sprzedaż potrzebuje boostu', value: 'sprzedaz' },
                { label: 'Mam wizję, potrzebuję exekucji', value: 'wizja' }
            ]
        },
        // --- Krok 2: Kontekst ---
        { name: 'industry', type: 'text', label: 'Branża' },
        { name: 'size', type: 'text', label: 'Wielkość zespołu' },
        { name: 'tools', type: 'text', label: 'Główne narzędzia' },
        // --- Dane kontaktowe ---
        { name: 'clientName', type: 'text', label: 'Imię i nazwisko', required: true },
        { name: 'clientEmail', type: 'email', label: 'Email', required: true },
        { name: 'phone', type: 'text', label: 'Telefon' },
        { name: 'company', type: 'text', label: 'Nazwa firmy', required: true },
        { name: 'nip', type: 'text', label: 'NIP' },
        // --- Krok 3: Problem ---
        { name: 'problemDescription', type: 'textarea', label: 'Opis problemu', required: true },
        {
            name: 'attachments',
            type: 'upload',
            label: 'Załączniki',
            relationTo: 'media' as any,
            hasMany: true,
            displayPreview: true,
        },
        // --- Krok 4: Skala ---
        { name: 'hoursWeek', type: 'number', label: 'Godziny tygodniowo' },
        {
            name: 'laborRate',
            type: 'select',
            label: 'Stawka roboczogodziny',
            options: [
                { label: 'Niska', value: 'low' },
                { label: 'Średnia', value: 'mid' },
                { label: 'Wysoka', value: 'high' }
            ]
        },
        { name: 'peopleInvolved', type: 'text', label: 'Ile osób zaangażowanych' },
        { name: 'growsWithScale', type: 'text', label: 'Czy problem rośnie ze skalą?' },
        // --- Krok 5: Co próbowaliście ---
        { name: 'triedBefore', type: 'json', label: 'Co próbowaliście wcześniej' },
        { name: 'triedNotes', type: 'textarea', label: 'Notatki — co nie zadziałało' },
        // --- Krok 6: Ramy ---
        {
            name: 'urgency',
            type: 'select',
            label: 'Pilność',
            options: [
                { label: 'Niska', value: 'low' },
                { label: 'Średnia', value: 'medium' },
                { label: 'Wysoka', value: 'high' },
                { label: 'Pilna', value: 'urgent' }
            ]
        },
        {
            name: 'scope',
            type: 'select',
            label: 'Zakres projektu',
            options: [
                { label: 'Tylko MVP', value: 'mvp' },
                { label: 'Pełny system', value: 'pelny' },
                { label: 'Nie wiem, doradzcie', value: 'doradzcie' }
            ]
        },
        { name: 'budget', type: 'text', label: 'Budżet orientacyjny' },
        { name: 'agreedPrivacy', type: 'checkbox', label: 'Zgoda na politykę prywatności', required: true },
        { name: 'agreedTerms', type: 'checkbox', label: 'Akceptacja regulaminu', required: true },
        {
            name: 'status',
            type: 'select',
            label: 'Status',
            defaultValue: 'new',
            options: [
                { label: 'Nowy', value: 'new' },
                { label: 'Skontaktowany', value: 'contacted' },
                { label: 'Wyceniony', value: 'quoted' },
                { label: 'Oczekuje na poprawki klienta', value: 'change_requested' },
                { label: 'Wygrany', value: 'won' },
                { label: 'Przegrany', value: 'lost' }
            ]
        },
        { name: 'source', type: 'text', label: 'Źródło', defaultValue: 'brief-form' }
    ],
    timestamps: true
};
