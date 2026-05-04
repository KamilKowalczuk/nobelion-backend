import type { CollectionConfig } from 'payload';

export const Briefs: CollectionConfig = {
    slug: 'briefs',
    admin: {
        useAsTitle: 'company',
        defaultColumns: ['company', 'email', 'status', 'budget', 'urgency', 'createdAt']
    },
    fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text' },
        { name: 'company', type: 'text', required: true },
        { name: 'nip', type: 'text' },
        { name: 'problemDescription', type: 'textarea', required: true },
        { name: 'budget', type: 'text' },
        { name: 'timeline', type: 'text' },
        { name: 'peopleInvolved', type: 'text' },
        {
            name: 'urgency',
            type: 'select',
            options: [
                { label: 'Niska', value: 'low' },
                { label: 'Średnia', value: 'medium' },
                { label: 'Wysoka', value: 'high' },
                { label: 'Pilna', value: 'urgent' }
            ]
        },
        { name: 'hoursWeek', type: 'number' },
        { name: 'agreedPrivacy', type: 'checkbox', required: true },
        { name: 'agreedTerms', type: 'checkbox', required: true },
        {
            name: 'status',
            type: 'select',
            defaultValue: 'new',
            options: [
                { label: 'Nowy', value: 'new' },
                { label: 'Skontaktowany', value: 'contacted' },
                { label: 'Wyceniony', value: 'quoted' },
                { label: 'Wygrany', value: 'won' },
                { label: 'Przegrany', value: 'lost' }
            ]
        },
        { name: 'source', type: 'text', defaultValue: 'brief-form' }
    ],
    timestamps: true
};
