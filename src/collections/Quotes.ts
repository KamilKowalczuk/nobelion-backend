import type { CollectionConfig } from 'payload';
import { sendQuoteEmail, sendInternalChangeRequestEmail } from '../services/email';
import { createStripeSession } from '../services/briefs'; // TODO: przenieś to do osobnego pliku payments
import crypto from 'crypto';

export const Quotes: CollectionConfig = {
    slug: 'quotes',
    admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'brief', 'status', 'totalPrice', 'createdAt']
    },
    labels: {
        singular: 'Wycena',
        plural: 'Wyceny',
    },
    access: {
        read: ({ req: { user } }) => true, // Zmienione by publicznie uderzać do endpointów GET, ew ograniczyć do endpointów niestandardowych
        create: ({ req: { user } }) => !!user,
        update: ({ req: { user } }) => !!user,
        delete: ({ req: { user } }) => !!user,
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            label: 'Tytuł wewnętrzny (np. Wycena dla Firmy X)',
            required: true,
        },
        {
            name: 'brief',
            type: 'relationship',
            relationTo: 'briefs',
            label: 'Powiązany Brief',
            required: true,
        },
        {
            name: 'status',
            type: 'select',
            label: 'Status',
            defaultValue: 'draft',
            options: [
                { label: 'Szkic', value: 'draft' },
                { label: 'Wysłana do klienta', value: 'sent' },
                { label: 'Zaakceptowana (Czeka na opłatę)', value: 'accepted' },
                { label: 'Odrzucona / Do poprawek', value: 'rejected' }
            ]
        },
        {
            name: 'quoteToken',
            type: 'text',
            label: 'Token wyceny (generowany automatycznie)',
            admin: { readOnly: true }
        },
        {
            type: 'tabs',
            tabs: [
                {
                    label: 'Treść (Bloki)',
                    fields: [
                        {
                            name: 'content',
                            type: 'blocks',
                            label: 'Zawartość wyceny',
                            blocks: [
                                {
                                    slug: 'richText',
                                    labels: { singular: 'Blok Tekstowy', plural: 'Bloki Tekstowe' },
                                    fields: [{ name: 'text', type: 'richText', label: 'Tekst sformatowany' }]
                                },
                                {
                                    slug: 'timeline',
                                    labels: { singular: 'Etap prac (Oś czasu)', plural: 'Etapy prac' },
                                    fields: [
                                        { name: 'phaseName', type: 'text', label: 'Nazwa etapu (np. Miesiąc 1, Faza UX)', required: true },
                                        { name: 'description', type: 'textarea', label: 'Krótki opis tego etapu' }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    label: 'Finanse i Opcje',
                    fields: [
                        { name: 'totalPrice', type: 'number', label: 'Cena całkowita projektu (netto PLN)', required: true },
                        { name: 'maintenancePrice', type: 'number', label: 'Cena miesięcznego utrzymania (netto PLN)' },
                        { name: 'maintenanceDescription', type: 'textarea', label: 'Opis zakresu utrzymania' },
                        { name: 'clientSelectedMaintenance', type: 'checkbox', label: 'Klient zdecydował się na utrzymanie', defaultValue: false }
                    ]
                },
                {
                    label: 'Status Płatności',
                    fields: [
                        {
                            name: 'paymentStatus',
                            type: 'select',
                            label: 'Status płatności startowej',
                            defaultValue: 'unpaid',
                            options: [
                                { label: 'Nieopłacone', value: 'unpaid' },
                                { label: 'Opłacone (Raty 50%)', value: 'paid_half' },
                                { label: 'Opłacone (Całość ze zniżką 10%)', value: 'paid_full' }
                            ],
                            admin: { readOnly: true, description: 'Aktualizowane przez webhook Stripe.' }
                        },
                        {
                            name: 'orderId',
                            type: 'relationship',
                            relationTo: 'orders',
                            label: 'Powiązane Zamówienie (Płatność)',
                            admin: { readOnly: true }
                        }
                    ]
                },
                {
                    label: 'Akcje wysyłki',
                    fields: [
                        { name: 'quoteSentAt', type: 'date', label: 'Data ostatniej wysyłki wyceny', admin: { readOnly: true } },
                        {
                            name: 'actionSendQuote',
                            type: 'checkbox',
                            label: 'WYŚLIJ WYCENĘ DO KLIENTA (Zapisz, aby wysłać)',
                            admin: { description: 'Zaznacz to pole i kliknij Zapisz, aby wysłać maila do klienta.' }
                        },
                        {
                            name: 'actionSendSubscription',
                            type: 'checkbox',
                            label: 'WYŚLIJ LINK DO ROZPOCZĘCIA SUBSKRYPCJI UTRZYMANIA',
                            admin: { description: 'Wysyła maila z linkiem do podpięcia karty na poczet abonamentu za utrzymanie.' }
                        }
                    ]
                }
            ]
        }
    ],
    hooks: {
        beforeChange: [
            async ({ data, req, operation }) => {
                if (!data.quoteToken) {
                    data.quoteToken = crypto.randomBytes(16).toString('hex');
                }

                if (data.actionSendQuote === true) {
                    if (data.brief) {
                        const brief = await req.payload.findByID({ collection: 'briefs', id: data.brief });
                        if (brief && brief.clientEmail) {
                            await sendQuoteEmail({
                                to: brief.clientEmail,
                                companyName: brief.company,
                                quoteAmount: data.totalPrice,
                                briefId: data.quoteToken
                            });
                            data.quoteSentAt = new Date().toISOString();
                            if (data.status === 'draft') data.status = 'sent';
                        }
                    }
                    data.actionSendQuote = false;
                }

                if (data.actionSendSubscription === true) {
                    if (data.brief) {
                        const brief = await req.payload.findByID({ collection: 'briefs', id: data.brief });
                        if (brief && brief.clientEmail) {
                            console.log('Wysyłam link do subskrypcji dla:', brief.clientEmail);
                            // TODO: Add Resend trigger for subscription link
                        }
                    }
                    data.actionSendSubscription = false;
                }

                return data;
            }
        ]
    },
    endpoints: [
        {
            path: '/client/:token',
            method: 'get',
            handler: async (req) => {
                const token = req.routeParams?.token;
                if (!token) return Response.json({ error: 'Brak tokenu' }, { status: 400 });

                const quotes = await req.payload.find({
                    collection: 'quotes',
                    where: { quoteToken: { equals: token } },
                    limit: 1,
                    depth: 1 // Fetch related Brief to get company name
                });

                if (quotes.docs.length === 0) {
                    return Response.json({ error: 'Wycena nie znaleziona' }, { status: 404 });
                }

                const quote = quotes.docs[0];
                return Response.json(quote);
            }
        },
        {
            path: '/client/:token/maintenance',
            method: 'post',
            handler: async (req) => {
                const token = req.routeParams?.token;
                if (!token) return Response.json({ error: 'Brak tokenu' }, { status: 400 });

                const body = await req.json();
                const wantsMaintenance = Boolean(body.wantsMaintenance);

                const quotes = await req.payload.find({
                    collection: 'quotes',
                    where: { quoteToken: { equals: token } },
                    limit: 1
                });

                if (quotes.docs.length === 0) {
                    return Response.json({ error: 'Wycena nie znaleziona' }, { status: 404 });
                }

                const quote = quotes.docs[0];
                await req.payload.update({
                    collection: 'quotes',
                    id: quote.id,
                    data: { clientSelectedMaintenance: wantsMaintenance }
                });

                return Response.json({ success: true, wantsMaintenance });
            }
        },
        {
            path: '/request-change/:token',
            method: 'post',
            handler: async (req) => {
                const token = req.routeParams?.token;
                if (!token) return Response.json({ error: 'Brak tokenu' }, { status: 400 });

                const body = await req.json();
                if (!body.message) return Response.json({ error: 'Brak wiadomości' }, { status: 400 });

                const quotes = await req.payload.find({
                    collection: 'quotes',
                    where: { quoteToken: { equals: token } },
                    limit: 1,
                    depth: 1
                });

                if (quotes.docs.length === 0) return Response.json({ error: 'Wycena nie znaleziona' }, { status: 404 });

                const quote = quotes.docs[0];
                
                await req.payload.update({
                    collection: 'quotes',
                    id: quote.id,
                    data: { status: 'rejected' }
                });
                
                if (typeof quote.brief === 'object' && quote.brief !== null) {
                    await sendInternalChangeRequestEmail({ company: quote.brief.company, message: body.message });
                }

                return Response.json({ success: true });
            }
        },
        {
            path: '/checkout/:token',
            method: 'post',
            handler: async (req) => {
                const token = req.routeParams?.token;
                if (!token) return Response.json({ error: 'Brak tokenu' }, { status: 400 });

                const body = await req.json();
                const is50Percent = body.paymentModel === '50';

                const quotes = await req.payload.find({
                    collection: 'quotes',
                    where: { quoteToken: { equals: token } },
                    limit: 1,
                    depth: 1
                });

                if (quotes.docs.length === 0) return Response.json({ error: 'Wycena nie znaleziona' }, { status: 404 });

                const quote = quotes.docs[0];
                const brief: any = quote.brief;
                if (!quote.totalPrice || !brief || typeof brief !== 'object') {
                    return Response.json({ error: 'Brak danych do wyceny' }, { status: 400 });
                }

                const amountToCharge = is50Percent ? Math.round(quote.totalPrice / 2) : Math.round(quote.totalPrice * 0.9);
                const description = is50Percent 
                    ? `I Rata (50%) - Wycena projektu dla ${brief.company}` 
                    : `Opłata całościowa z rabatem 10% - Wycena projektu dla ${brief.company}`;

                try {
                    const session = await createStripeSession({
                        payment_method_types: ['card', 'blik', 'p24'],
                        line_items: [
                            {
                                price_data: {
                                    currency: 'pln',
                                    product_data: {
                                        name: `Wycena Projektu - ${brief.company}`,
                                        description: description
                                    },
                                    unit_amount: Math.round(amountToCharge * 100) // grosze
                                },
                                quantity: 1,
                            },
                        ],
                        mode: 'payment',
                        success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:4321/dziekujemy?session_id={CHECKOUT_SESSION_ID}',
                        cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:4321/blad-platnosci',
                        customer_email: brief.clientEmail,
                        metadata: {
                            quoteId: String(quote.id),
                            briefId: String(brief.id),
                            paymentModel: is50Percent ? '50' : '100',
                            isFirstTranche: is50Percent ? 'true' : 'false'
                        }
                    });

                    return Response.json({ url: session.url });
                } catch (error: any) {
                    return Response.json({ error: error.message }, { status: 500 });
                }
            }
        }
    ],
    timestamps: true
};
