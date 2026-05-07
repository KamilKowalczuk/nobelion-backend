import type { CollectionConfig } from 'payload';

export const Orders: CollectionConfig = {
    slug: 'orders',
    admin: {
        useAsTitle: 'orderNumber',
        defaultColumns: ['orderNumber', 'customerEmail', 'amount', 'currency', 'status', 'createdAt']
    },
    labels: {
        singular: 'Zamówienie',
        plural: 'Zamówienia',
    },
    fields: [
        { name: 'orderNumber', type: 'text', label: 'Numer zamówienia' },
        {
            name: 'briefId',
            type: 'relationship',
            label: 'Powiązany brief',
            relationTo: 'briefs',
            required: false
        },
        { name: 'stripeEventId', type: 'text', label: 'Stripe Event ID' },
        { name: 'stripeSessionId', type: 'text', label: 'Stripe Session ID' },
        { name: 'stripePaymentIntentId', type: 'text', label: 'Stripe Payment Intent ID' },
        { name: 'amount', type: 'number', label: 'Kwota (grosze)', required: true },
        { name: 'currency', type: 'text', label: 'Waluta', required: true, defaultValue: 'pln' },
        {
            name: 'status',
            type: 'select',
            label: 'Status płatności',
            defaultValue: 'pending',
            options: [
                { label: 'Oczekujące', value: 'pending' },
                { label: 'Opłacone', value: 'paid' },
                { label: 'Nieudane', value: 'failed' },
                { label: 'Zwrócone', value: 'refunded' }
            ]
        },
        { name: 'customerEmail', type: 'email', label: 'Email klienta' },
        { name: 'billingName', type: 'text', label: 'Imię i nazwisko (faktura)' },
        { name: 'billingPhone', type: 'text', label: 'Telefon (faktura)' },
        { name: 'billingCompanyName', type: 'text', label: 'Nazwa firmy (faktura)' },
        { name: 'billingNip', type: 'text', label: 'NIP (faktura)' },
        { name: 'billingStreet', type: 'text', label: 'Ulica' },
        { name: 'billingCity', type: 'text', label: 'Miasto' },
        { name: 'billingPostalCode', type: 'text', label: 'Kod pocztowy' },
        { name: 'billingCountry', type: 'text', label: 'Kraj' },
        {
            name: 'payments',
            type: 'array',
            label: 'Historia płatności',
            labels: { singular: 'Płatność', plural: 'Płatności' },
            fields: [
                { name: 'stripeInvoiceId', type: 'text', label: 'Stripe Invoice ID' },
                { name: 'amount', type: 'number', label: 'Kwota' },
                { name: 'paidAt', type: 'date', label: 'Data płatności' },
                {
                    name: 'status',
                    type: 'select',
                    label: 'Status',
                    options: [
                        { label: 'Opłacone', value: 'paid' },
                        { label: 'Nieudane', value: 'failed' }
                    ]
                },
                { name: 'fakturaXlInvoiceId', type: 'text', label: 'Faktura XL — nr faktury' },
                {
                    name: 'invoiceStatus',
                    type: 'select',
                    label: 'Status faktury',
                    options: [
                        { label: 'Wysłana', value: 'sent' },
                        { label: 'Błąd', value: 'error' }
                    ]
                }
            ]
        }
    ],
    hooks: {
        beforeChange: [
            async ({ data, operation, req }: any) => {
                if (operation === 'create' && !data.orderNumber) {
                    const count = await req.payload.count({ collection: 'orders' });
                    data.orderNumber = `NBL-${String(count.totalDocs + 1).padStart(6, '0')}`;
                }
                return data;
            }
        ]
    },
    timestamps: true
};
