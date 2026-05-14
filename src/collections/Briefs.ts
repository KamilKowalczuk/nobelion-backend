import type { CollectionConfig } from 'payload';

export const Briefs: CollectionConfig = {
    slug: 'briefs',
    admin: {
        useAsTitle: 'company',
        defaultColumns: ['company', 'clientEmail', 'status', 'budget', 'urgency', 'createdAt']
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
    fields: [
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
        // --- Krok 4: Skala ---
        { name: 'hoursWeek', type: 'number', label: 'Godziny tygodniowo' },
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
                { label: 'Wczoraj, palące', value: 'palace' },
                { label: 'W tym miesiącu', value: 'miesiac' },
                { label: 'W kwartale', value: 'kwartal' },
                { label: 'Rozważam, brak deadline', value: 'rozwazam' }
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
        // --- Pola Wyceny usunięte. Wszystkie wyceny tworzone są teraz w osobnej kolekcji 'Quotes'. ---
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
