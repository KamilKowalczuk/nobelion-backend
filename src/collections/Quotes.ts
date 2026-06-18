import type { CollectionConfig } from 'payload';
import { isRateLimited } from '../services/rateLimit';
import { quoteBeforeChangeHook } from '../hooks/quoteHooks';
import { PaymentStatus, QuoteStatus } from '../constants/quotes';

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
        // Odczyt tylko dla zalogowanych. Klient czyta wycenę przez gated endpoint /client/:token
        // (lokalne API → overrideAccess, więc działa mimo zamkniętego read).
        read: ({ req: { user } }) => !!user,
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
                            type: 'textarea',
                            label: 'Wstęp / Opis projektu (Markdown)',
                            admin: {
                                rows: 10,
                                description: 'Markdown: **pogrubienie**, *kursywa*, ## nagłówek, - lista, 1. lista numerowana, [tekst](https://...), > cytat. Pusta linia = nowy akapit.',
                            }
                        },
                        {
                            name: 'timelinePlan',
                            type: 'textarea',
                            label: 'Plan realizacji (Markdown)',
                            admin: {
                                rows: 10,
                                description: 'Etapy projektu. Np. "### Faza 1 — Analiza" + lista pod spodem. Obsługuje pełny Markdown.',
                            }
                        },
                        {
                            name: 'scopePlan',
                            type: 'textarea',
                            label: 'Zakres prac (Markdown)',
                            admin: {
                                rows: 10,
                                description: 'Co wchodzi w zakres, a co nie. Użyj list: "- Pozycja w zakresie". Obsługuje pełny Markdown.',
                            }
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
                            defaultValue: PaymentStatus.UNPAID,
                            options: [
                                { label: '⏳ Nieopłacone', value: PaymentStatus.UNPAID },
                                { label: '💛 I Rata (50%) opłacona', value: PaymentStatus.PAID_HALF },
                                { label: '💚 Całość opłacona', value: PaymentStatus.PAID_FULL }
                            ],
                            admin: { readOnly: true, description: 'Aktualizowane automatycznie przez webhook Stripe.' }
                        },
                        {
                            name: 'orderId',
                            type: 'relationship',
                            relationTo: 'orders',
                            label: 'Powiązane Zamówienie',
                            admin: { readOnly: true, description: 'Wypełniane automatycznie po płatności.' }
                        },
                        {
                            name: 'subscriptionStatus',
                            type: 'select',
                            label: 'Status subskrypcji (utrzymanie)',
                            defaultValue: 'none',
                            options: [
                                { label: '— Brak', value: 'none' },
                                { label: '💚 Aktywna', value: 'active' },
                                { label: '🔴 Anulowana przez klienta', value: 'canceled' }
                            ],
                            admin: { readOnly: true, description: 'Aktualizowane automatycznie przez webhook Stripe.' }
                        },
                        {
                            type: 'row',
                            fields: [
                                {
                                    name: 'stripeSubscriptionId',
                                    type: 'text',
                                    label: 'Stripe Subscription ID',
                                    admin: { readOnly: true, width: '50%' }
                                },
                                {
                                    name: 'stripeCustomerId',
                                    type: 'text',
                                    label: 'Stripe Customer ID',
                                    admin: { readOnly: true, width: '50%' }
                                }
                            ]
                        },
                        {
                            name: 'subscriptionBilling',
                            type: 'group',
                            label: 'Dane do faktur subskrypcyjnych',
                            admin: {
                                description: 'Zapisywane automatycznie z checkoutu Stripe przy aktywacji subskrypcji. Używane przez FakturaXL przy każdej płatności cyklicznej.',
                            },
                            fields: [
                                {
                                    type: 'row',
                                    fields: [
                                        { name: 'companyName', type: 'text', label: 'Nazwa firmy', admin: { readOnly: true, width: '50%' } },
                                        { name: 'nip', type: 'text', label: 'NIP', admin: { readOnly: true, width: '50%' } },
                                    ]
                                },
                                {
                                    type: 'row',
                                    fields: [
                                        { name: 'street', type: 'text', label: 'Ulica', admin: { readOnly: true, width: '50%' } },
                                        { name: 'city', type: 'text', label: 'Miasto', admin: { readOnly: true, width: '50%' } },
                                    ]
                                },
                                {
                                    type: 'row',
                                    fields: [
                                        { name: 'postalCode', type: 'text', label: 'Kod pocztowy', admin: { readOnly: true, width: '50%' } },
                                        { name: 'phone', type: 'text', label: 'Telefon', admin: { readOnly: true, width: '50%' } },
                                    ]
                                },
                            ]
                        }
                    ]
                },

                // ── ZGODY (ślad audytowy clickwrap) ──────────────────
                {
                    label: '📜 Zgody',
                    description: 'Dowód akceptacji dokumentów przez klienta w momencie płatności.',
                    fields: [
                        {
                            name: 'consent',
                            type: 'group',
                            label: 'Akceptacja dokumentów',
                            admin: { description: 'Zapisywane automatycznie przy pierwszej płatności. Tylko do odczytu.' },
                            fields: [
                                {
                                    type: 'row',
                                    fields: [
                                        { name: 'acceptedAt', type: 'date', label: 'Data akceptacji', admin: { readOnly: true, width: '50%' } },
                                        { name: 'ip', type: 'text', label: 'Adres IP', admin: { readOnly: true, width: '50%' } },
                                    ]
                                },
                                { name: 'email', type: 'text', label: 'E-mail akceptującego', admin: { readOnly: true } },
                                { name: 'agreementAccepted', type: 'checkbox', label: 'Umowa współpracy zaakceptowana', admin: { readOnly: true } },
                                // Surowe dane zostają w bazie (źródło prawdy), ale w panelu chowamy je
                                // na rzecz czytelnego widoku z linkiem do zaakceptowanego snapshotu.
                                { name: 'documents', type: 'json', label: 'Zaakceptowane dokumenty (surowe dane)', admin: { readOnly: true, hidden: true } },
                                {
                                    name: 'generatedContractPdf',
                                    type: 'upload',
                                    relationTo: 'media',
                                    label: 'Wygenerowany plik umowy (PDF)',
                                    admin: { readOnly: true, description: 'Generowany automatycznie po płatności i wysyłany do klienta.' }
                                },
                                {
                                    name: 'consentDocsView',
                                    type: 'ui',
                                    admin: {
                                        components: {
                                            Field: '/src/components/ConsentDocs.tsx#ConsentDocs',
                                        }
                                    }
                                },
                            ]
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
                                    admin: { readOnly: true, width: '33%' }
                                },
                                {
                                    name: 'subscriptionSentAt',
                                    type: 'date',
                                    label: 'Link subskrypcji wysłany',
                                    admin: { readOnly: true, width: '33%' }
                                },
                                {
                                    name: 'finalPaymentSentAt',
                                    type: 'date',
                                    label: 'Link II raty wysłany',
                                    admin: { readOnly: true, width: '33%' }
                                }
                            ]
                        },
                        { name: 'actionSendQuote', type: 'checkbox', admin: { hidden: true } },
                        { name: 'actionSendSubscription', type: 'checkbox', admin: { hidden: true } },
                        { name: 'actionSendFinalPayment', type: 'checkbox', admin: { hidden: true } },
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
        beforeChange: [quoteBeforeChangeHook],
        afterChange: [
            async ({ doc }) => {
                return doc;
            }
        ]
    },
    endpoints: [
        {
            path: '/client/:token',
            method: 'get',
            handler: async (req) => {
                const { getClientQuote } = await import('../services/quoteClientService');
                return getClientQuote(req, req.routeParams?.token as string);
            }
        },
        {
            path: '/client/:token/maintenance',
            method: 'post',
            handler: async (req) => {
                const { updateClientMaintenance } = await import('../services/quoteClientService');
                const body = await req.json();
                return updateClientMaintenance(req, req.routeParams?.token as string, body.wantsMaintenance);
            }
        },
        {
            path: '/request-change/:token',
            method: 'post',
            handler: async (req) => {
                if (isRateLimited(req.headers as Headers, { key: 'quote-change', limit: 5, windowMs: 10 * 60 * 1000 })) {
                    return Response.json({ error: 'Zbyt wiele żądań. Spróbuj ponownie później.' }, { status: 429 });
                }
                const { requestClientChange } = await import('../services/quoteClientService');
                const body = await req.json();
                return requestClientChange(req, req.routeParams?.token as string, body.message);
            }
        },
        {
            path: '/checkout/:token',
            method: 'post',
            handler: async (req) => {
                if (isRateLimited(req.headers as Headers, { key: 'quote-checkout', limit: 10, windowMs: 10 * 60 * 1000 })) {
                    return Response.json({ error: 'Zbyt wiele żądań. Spróbuj ponownie później.' }, { status: 429 });
                }
                const { processCheckout } = await import('../services/quoteCheckoutService');
                const body = await req.json();
                return processCheckout(req, req.routeParams?.token as string, body);
            }
        },
        {
            path: '/subscribe/:token',
            method: 'get',
            handler: async (req) => {
                if (isRateLimited(req.headers as Headers, { key: 'quote-subscribe', limit: 10, windowMs: 10 * 60 * 1000 })) {
                    return new Response('Zbyt wiele żądań. Spróbuj ponownie później.', { status: 429 });
                }
                const { processSubscribe } = await import('../services/quoteCheckoutService');
                return processSubscribe(req, req.routeParams?.token as string);
            }
        },
        {
            path: '/pay-final/:token',
            method: 'get',
            handler: async (req) => {
                if (isRateLimited(req.headers as Headers, { key: 'quote-pay-final', limit: 10, windowMs: 10 * 60 * 1000 })) {
                    return new Response('Zbyt wiele żądań. Spróbuj ponownie później.', { status: 429 });
                }
                const { processPayFinal } = await import('../services/quoteCheckoutService');
                return processPayFinal(req, req.routeParams?.token as string);
            }
        },
        {
            path: '/subscription-portal/:token',
            method: 'get',
            handler: async (req) => {
                if (isRateLimited(req.headers as Headers, { key: 'quote-portal', limit: 10, windowMs: 10 * 60 * 1000 })) {
                    return new Response('Zbyt wiele żądań. Spróbuj ponownie później.', { status: 429 });
                }
                const { createPortalSession } = await import('../services/quoteCheckoutService');
                return createPortalSession(req, req.routeParams?.token as string);
            }
        }
    ],
    timestamps: true
};
