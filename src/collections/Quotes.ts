import type { CollectionConfig } from 'payload';
import { sendQuoteEmail, sendInternalChangeRequestEmail } from '../services/email';
import { createStripeSession } from '../services/briefs';
import crypto from 'crypto';

export const Quotes: CollectionConfig = {
    slug: 'quotes',
    admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'brief', 'status', 'paymentStatus', 'totalPrice', 'createdAt'],
        description: 'Wyceny dla klientów. Uzupełnij treść, ustaw cenę i kliknij "Wyślij wycenę do klienta".',
    },
    labels: {
        singular: 'Wycena',
        plural: 'Wyceny',
    },
    access: {
        read: () => true,
        create: ({ req: { user } }) => !!user,
        update: ({ req: { user } }) => !!user,
        delete: ({ req: { user } }) => !!user,
    },
    fields: [
        // ── Nagłówek (widoczny zawsze nad zakładkami) ─────────────────
        {
            name: 'title',
            type: 'text',
            label: 'Tytuł wewnętrzny',
            required: true,
            admin: {
                placeholder: 'np. Wycena Automatyzacji — Acme Sp. z o.o.',
                description: 'Tylko do użytku wewnętrznego. Klient tego nie widzi.',
            }
        },
        {
            name: 'brief',
            type: 'relationship',
            relationTo: 'briefs',
            label: 'Klient (Brief)',
            required: true,
            admin: {
                description: 'Wpisz nazwę firmy, imię lub email klienta żeby znaleźć odpowiedni brief.',
            }
        },
        {
            type: 'row',
            fields: [
                {
                    name: 'status',
                    type: 'select',
                    label: 'Status wyceny',
                    defaultValue: 'draft',
                    admin: { width: '50%' },
                    options: [
                        { label: '📝 Szkic', value: 'draft' },
                        { label: '📤 Wysłana do klienta', value: 'sent' },
                        { label: '✅ Zaakceptowana', value: 'accepted' },
                        { label: '🔄 Do poprawek', value: 'rejected' }
                    ]
                },
                {
                    name: 'quoteToken',
                    type: 'text',
                    label: 'Link klienta (token)',
                    admin: {
                        readOnly: true,
                        width: '50%',
                        description: 'Auto-generowany. Klient wchodzi przez /wycena/{token}',
                    }
                }
            ]
        },

        // ── Zakładki ──────────────────────────────────────────────────
        {
            type: 'tabs',
            tabs: [

                // ── TREŚĆ ─────────────────────────────────────────────
                {
                    label: '📄 Treść wyceny',
                    description: 'Te sekcje składają się na treść wyceny widoczną przez klienta.',
                    fields: [
                        {
                            name: 'intro',
                            type: 'richText',
                            label: 'Wstęp / Opis projektu',
                            admin: {
                                description: 'Główna treść: kontekst, zakres, technologia. Obsługuje formatowanie (bold, listy, nagłówki).',
                            }
                        },
                        {
                            name: 'timelinePhases',
                            type: 'array',
                            label: 'Plan realizacji',
                            labels: { singular: 'Etap', plural: 'Etapy' },
                            admin: {
                                description: 'Dodaj kolejne etapy projektu. Każdy etap pojawi się na osi czasu w wycenie.',
                                components: {},
                            },
                            fields: [
                                {
                                    name: 'phaseName',
                                    type: 'text',
                                    label: 'Nazwa etapu',
                                    required: true,
                                    admin: { placeholder: 'np. Faza 1 — Analiza i Projekt UX' }
                                },
                                {
                                    name: 'duration',
                                    type: 'text',
                                    label: 'Czas trwania',
                                    admin: { placeholder: 'np. 2 tygodnie', width: '50%' }
                                },
                                {
                                    name: 'description',
                                    type: 'textarea',
                                    label: 'Opis etapu',
                                    admin: {
                                        rows: 3,
                                        placeholder: 'Co konkretnie dzieje się w tym etapie...',
                                    }
                                }
                            ]
                        },
                        {
                            name: 'scopeItems',
                            type: 'array',
                            label: 'Zakres prac',
                            labels: { singular: 'Pozycja', plural: 'Pozycje' },
                            admin: {
                                description: 'Lista deliverables: co wchodzi w zakres, a co nie.',
                                components: {},
                            },
                            fields: [
                                {
                                    name: 'item',
                                    type: 'text',
                                    label: 'Opis',
                                    required: true,
                                    admin: { placeholder: 'np. Integracja z systemem ERP klienta' }
                                },
                                {
                                    name: 'included',
                                    type: 'select',
                                    label: 'Status',
                                    defaultValue: 'included',
                                    options: [
                                        { label: '✅ W zakresie', value: 'included' },
                                        { label: '❌ Poza zakresem', value: 'excluded' },
                                    ]
                                }
                            ]
                        }
                    ]
                },

                // ── FINANSE ───────────────────────────────────────────
                {
                    label: '💰 Finanse',
                    fields: [
                        {
                            type: 'row',
                            fields: [
                                {
                                    name: 'totalPrice',
                                    type: 'number',
                                    label: 'Cena całkowita netto (PLN)',
                                    required: true,
                                    admin: {
                                        width: '50%',
                                        step: 100,
                                        description: 'Klient widzi rabat 10% przy płatności jednorazowej.',
                                    }
                                },
                                {
                                    name: 'maintenancePrice',
                                    type: 'number',
                                    label: 'Cena utrzymania / miesiąc netto (PLN)',
                                    admin: {
                                        width: '50%',
                                        step: 50,
                                        description: 'Zostaw puste jeśli nie oferujesz utrzymania.',
                                    }
                                }
                            ]
                        },
                        {
                            name: 'maintenanceDescription',
                            type: 'textarea',
                            label: 'Opis pakietu utrzymania',
                            admin: {
                                rows: 3,
                                placeholder: 'Co obejmuje abonament: hosting, monitoring, poprawki...',
                                condition: (data) => !!data.maintenancePrice,
                            }
                        },
                        {
                            name: 'clientSelectedMaintenance',
                            type: 'checkbox',
                            label: 'Klient zdecydował się na utrzymanie',
                            defaultValue: false,
                            admin: { readOnly: true, description: 'Aktualizowane przez klienta na stronie wyceny.' }
                        }
                    ]
                },

                // ── PŁATNOŚĆ ──────────────────────────────────────────
                {
                    label: '💳 Płatność',
                    fields: [
                        {
                            name: 'paymentStatus',
                            type: 'select',
                            label: 'Status płatności',
                            defaultValue: 'unpaid',
                            options: [
                                { label: '⏳ Nieopłacone', value: 'unpaid' },
                                { label: '💛 I Rata (50%) opłacona', value: 'paid_half' },
                                { label: '💚 Całość opłacona (–10%)', value: 'paid_full' }
                            ],
                            admin: { readOnly: true, description: 'Aktualizowane automatycznie przez webhook Stripe.' }
                        },
                        {
                            name: 'orderId',
                            type: 'relationship',
                            relationTo: 'orders',
                            label: 'Powiązane Zamówienie',
                            admin: { readOnly: true, description: 'Wypełniane automatycznie po płatności.' }
                        }
                    ]
                },

                // ── AKCJE ─────────────────────────────────────────────
                {
                    label: '⚡ Akcje i Logi',
                    fields: [
                        {
                            type: 'row',
                            fields: [
                                {
                                    name: 'quoteSentAt',
                                    type: 'date',
                                    label: 'Wycena wysłana',
                                    admin: { readOnly: true, width: '50%' }
                                },
                                {
                                    name: 'subscriptionSentAt',
                                    type: 'date',
                                    label: 'Link subskrypcji wysłany',
                                    admin: { readOnly: true, width: '50%' }
                                }
                            ]
                        },
                        { name: 'actionSendQuote', type: 'checkbox', admin: { hidden: true } },
                        { name: 'actionSendSubscription', type: 'checkbox', admin: { hidden: true } },
                        {
                            name: 'buttonActions',
                            type: 'ui',
                            admin: {
                                components: {
                                    Field: '/src/components/QuoteActions.tsx#QuoteActions',
                                }
                            }
                        }
                    ]
                }
            ]
        }
    ],
    hooks: {
        beforeChange: [
            async ({ data, req }) => {
                if (!data.quoteToken) {
                    data.quoteToken = crypto.randomBytes(16).toString('hex');
                }

                if (data.actionSendQuote === true) {
                    if (!data.brief) throw new Error('Nie można wysłać wyceny bez powiązanego briefu.');
                    if (!data.totalPrice || data.totalPrice <= 0) throw new Error('Ustaw cenę przed wysłaniem wyceny.');

                    const brief = await req.payload.findByID({
                        collection: 'briefs',
                        id: typeof data.brief === 'object' ? data.brief.id : data.brief
                    });
                    if (!brief?.clientEmail) throw new Error('Brief nie ma adresu email klienta.');

                    await sendQuoteEmail({
                        to: brief.clientEmail,
                        companyName: brief.company,
                        quoteAmount: data.totalPrice,
                        quoteToken: data.quoteToken
                    });
                    data.quoteSentAt = new Date().toISOString();
                    if (data.status === 'draft') data.status = 'sent';
                    data.actionSendQuote = false;
                }

                if (data.actionSendSubscription === true) {
                    if (data.brief) {
                        const brief = await req.payload.findByID({
                            collection: 'briefs',
                            id: typeof data.brief === 'object' ? data.brief.id : data.brief
                        });
                        if (brief?.clientEmail) {
                            console.log('[Quotes] Wysyłam link subskrypcji do', brief.clientEmail);
                            data.subscriptionSentAt = new Date().toISOString();
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
                    depth: 1
                });

                if (quotes.docs.length === 0) return Response.json({ error: 'Wycena nie znaleziona' }, { status: 404 });

                const quote = quotes.docs[0];
                if (quote.status === 'draft') return Response.json({ error: 'Wycena nie jest jeszcze dostępna' }, { status: 404 });

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
                const quotes = await req.payload.find({
                    collection: 'quotes',
                    where: { quoteToken: { equals: token } },
                    limit: 1
                });
                if (quotes.docs.length === 0) return Response.json({ error: 'Wycena nie znaleziona' }, { status: 404 });

                await req.payload.update({
                    collection: 'quotes',
                    id: quotes.docs[0].id,
                    data: { clientSelectedMaintenance: Boolean(body.wantsMaintenance) }
                });

                return Response.json({ success: true });
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
                await req.payload.update({ collection: 'quotes', id: quote.id, data: { status: 'rejected' } });

                if (typeof quote.brief === 'object' && quote.brief !== null) {
                    await sendInternalChangeRequestEmail({
                        company: (quote.brief as any).company,
                        message: body.message
                    });
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

                const amountToCharge = is50Percent
                    ? Math.round(quote.totalPrice / 2)
                    : Math.round(quote.totalPrice * 0.9);

                try {
                    const session = await createStripeSession({
                        payment_method_types: ['card', 'blik', 'p24'],
                        line_items: [{
                            price_data: {
                                currency: 'pln',
                                product_data: {
                                    name: `Wycena Projektu — ${brief.company}`,
                                    description: is50Percent
                                        ? `I Rata (50%) — ${brief.company}`
                                        : `Opłata całościowa (–10%) — ${brief.company}`
                                },
                                unit_amount: Math.round(amountToCharge * 100)
                            },
                            quantity: 1,
                        }],
                        mode: 'payment',
                        success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:4321/dziekujemy?session_id={CHECKOUT_SESSION_ID}',
                        cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:4321/blad-platnosci',
                        customer_email: brief.clientEmail,
                        metadata: {
                            quoteId: String(quote.id),
                            briefId: String(brief.id),
                            paymentModel: is50Percent ? '50' : '100',
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
