import type { CollectionConfig } from 'payload';

export const Orders: CollectionConfig = {
    slug: 'orders',
    admin: {
        useAsTitle: 'orderNumber',
        defaultColumns: ['orderNumber', 'customerEmail', 'amount', 'currency', 'status', 'createdAt']
    },
    fields: [
        { name: 'orderNumber', type: 'text' },
        {
            name: 'briefId',
            type: 'relationship',
            relationTo: 'briefs',
            required: false
        },
        { name: 'stripeEventId', type: 'text' },
        { name: 'stripeSessionId', type: 'text' },
        { name: 'stripePaymentIntentId', type: 'text' },
        { name: 'amount', type: 'number', required: true },
        { name: 'currency', type: 'text', required: true, defaultValue: 'pln' },
        {
            name: 'status',
            type: 'select',
            defaultValue: 'pending',
            options: [
                { label: 'Oczekujące', value: 'pending' },
                { label: 'Opłacone', value: 'paid' },
                { label: 'Nieudane', value: 'failed' },
                { label: 'Zwrócone', value: 'refunded' }
            ]
        },
        { name: 'customerEmail', type: 'email' },
        { name: 'billingName', type: 'text' },
        { name: 'billingPhone', type: 'text' },
        { name: 'billingCompanyName', type: 'text' },
        { name: 'billingNip', type: 'text' },
        { name: 'billingStreet', type: 'text' },
        { name: 'billingCity', type: 'text' },
        { name: 'billingPostalCode', type: 'text' },
        { name: 'billingCountry', type: 'text' },
        {
            name: 'payments',
            type: 'array',
            fields: [
                { name: 'stripeInvoiceId', type: 'text' },
                { name: 'amount', type: 'number' },
                { name: 'paidAt', type: 'date' },
                {
                    name: 'status',
                    type: 'select',
                    options: [
                        { label: 'Opłacone', value: 'paid' },
                        { label: 'Nieudane', value: 'failed' }
                    ]
                },
                { name: 'fakturaXlInvoiceId', type: 'text' },
                {
                    name: 'invoiceStatus',
                    type: 'select',
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
