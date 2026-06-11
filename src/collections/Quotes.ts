import type { CollectionConfig } from 'payload';
import { sendQuoteEmail, sendInternalChangeRequestEmail, sendSubscriptionEmail, sendFinalPaymentEmail } from '../services/email';
import { createStripeSession, createBillingPortalSession, getCmsPublicUrl, invoiceDataCollection } from '../services/briefs';
import { isRateLimited } from '../services/rateLimit';
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
                            defaultValue: 'unpaid',
                            options: [
                                { label: '⏳ Nieopłacone', value: 'unpaid' },
                                { label: '💛 I Rata (50%) opłacona', value: 'paid_half' },
                                { label: '💚 Całość opłacona', value: 'paid_full' }
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
                    if (!data.brief) throw new Error('Nie można wysłać linku subskrypcji bez powiązanego briefu.');
                    if (!data.maintenancePrice || data.maintenancePrice <= 0) {
                        throw new Error('Ustaw cenę utrzymania (Finanse → Cena utrzymania / miesiąc) przed wysłaniem linku subskrypcji.');
                    }

                    const brief = await req.payload.findByID({
                        collection: 'briefs',
                        id: typeof data.brief === 'object' ? data.brief.id : data.brief
                    });
                    if (!brief?.clientEmail) throw new Error('Brief nie ma adresu email klienta.');

                    const cmsUrl = getCmsPublicUrl();
                    await sendSubscriptionEmail({
                        to: brief.clientEmail,
                        companyName: brief.company,
                        monthlyAmount: data.maintenancePrice,
                        description: data.maintenanceDescription,
                        subscribeUrl: `${cmsUrl}/api/quotes/subscribe/${data.quoteToken}`,
                        portalUrl: `${cmsUrl}/api/quotes/subscription-portal/${data.quoteToken}`,
                    });
                    data.subscriptionSentAt = new Date().toISOString();
                    data.actionSendSubscription = false;
                }

                if (data.actionSendFinalPayment === true) {
                    if (data.paymentStatus !== 'paid_half') {
                        throw new Error('Link do II raty można wysłać dopiero po opłaceniu I raty (50%).');
                    }
                    if (!data.brief) throw new Error('Nie można wysłać linku płatności bez powiązanego briefu.');
                    if (!data.totalPrice || data.totalPrice <= 0) throw new Error('Brak ceny całkowitej w wycenie.');

                    const brief = await req.payload.findByID({
                        collection: 'briefs',
                        id: typeof data.brief === 'object' ? data.brief.id : data.brief
                    });
                    if (!brief?.clientEmail) throw new Error('Brief nie ma adresu email klienta.');

                    // I rata = zaokrąglone 50%; II rata = dokładna reszta (suma rat = cena całkowita).
                    const remaining = data.totalPrice - Math.round(data.totalPrice / 2);
                    await sendFinalPaymentEmail({
                        to: brief.clientEmail,
                        companyName: brief.company,
                        amount: remaining,
                        payUrl: `${getCmsPublicUrl()}/api/quotes/pay-final/${data.quoteToken}`,
                    });
                    data.finalPaymentSentAt = new Date().toISOString();
                    data.actionSendFinalPayment = false;
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

                // Whitelist pól — nie zwracamy pól wewnętrznych (title, actionSend*, orderId)
                // ani pełnego briefu z PII. Klient dostaje tylko to, co renderuje strona wyceny.
                // (q jako any — payload-types.ts bywa nieaktualny po dodaniu pól richText.)
                const q: any = quote;
                const brief: any = (typeof q.brief === 'object' && q.brief !== null) ? q.brief : {};
                return Response.json({
                    status: q.status,
                    totalPrice: q.totalPrice,
                    maintenancePrice: q.maintenancePrice ?? null,
                    maintenanceDescription: q.maintenanceDescription ?? null,
                    clientSelectedMaintenance: q.clientSelectedMaintenance ?? false,
                    intro: q.intro ?? null,
                    timelinePlan: q.timelinePlan ?? null,
                    scopePlan: q.scopePlan ?? null,
                    brief: {
                        company: brief.company ?? null,
                        problemDescription: brief.problemDescription ?? null,
                    },
                });
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
                if (isRateLimited(req.headers as Headers, { key: 'quote-change', limit: 5, windowMs: 10 * 60 * 1000 })) {
                    return Response.json({ error: 'Zbyt wiele żądań. Spróbuj ponownie później.' }, { status: 429 });
                }
                const token = req.routeParams?.token;
                if (!token) return Response.json({ error: 'Brak tokenu' }, { status: 400 });

                const body = await req.json();
                const message = typeof body.message === 'string' ? body.message.trim() : '';
                if (!message) return Response.json({ error: 'Brak wiadomości' }, { status: 400 });
                if (message.length > 2000) return Response.json({ error: 'Wiadomość jest zbyt długa (max 2000 znaków).' }, { status: 400 });

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
                        message
                    });
                }

                return Response.json({ success: true });
            }
        },
        {
            path: '/checkout/:token',
            method: 'post',
            handler: async (req) => {
                if (isRateLimited(req.headers as Headers, { key: 'quote-checkout', limit: 10, windowMs: 10 * 60 * 1000 })) {
                    return Response.json({ error: 'Zbyt wiele żądań. Spróbuj ponownie później.' }, { status: 429 });
                }
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
                        // Dane do faktury (adres, telefon, NIP) — wspólna definicja w services/briefs.ts.
                        ...invoiceDataCollection,
                        metadata: {
                            quoteId: String(quote.id),
                            briefId: String(brief.id),
                            paymentModel: is50Percent ? '50' : '100',
                        }
                    });

                    return Response.json({ url: session.url });
                } catch (error: any) {
                    // Nie ujawniamy klientowi szczegółów błędu (SDK/Stripe/infrastruktura).
                    console.error('[Quotes checkout] Błąd tworzenia sesji Stripe:', error?.message || error);
                    return Response.json({ error: 'Nie udało się utworzyć sesji płatności. Spróbuj ponownie później.' }, { status: 500 });
                }
            }
        },
        {
            // Link z maila "Aktywuj subskrypcję" — tworzy świeżą sesję Stripe Checkout
            // (mode=subscription) i przekierowuje klienta. Sesje wygasają po 24h,
            // dlatego mail linkuje tutaj, a nie bezpośrednio do session.url.
            path: '/subscribe/:token',
            method: 'get',
            handler: async (req) => {
                if (isRateLimited(req.headers as Headers, { key: 'quote-subscribe', limit: 10, windowMs: 10 * 60 * 1000 })) {
                    return new Response('Zbyt wiele żądań. Spróbuj ponownie później.', { status: 429 });
                }
                const token = req.routeParams?.token;
                if (!token) return new Response('Brak tokenu', { status: 400 });

                const quotes = await req.payload.find({
                    collection: 'quotes',
                    where: { quoteToken: { equals: token } },
                    limit: 1,
                    depth: 1
                });
                if (quotes.docs.length === 0) return new Response('Nie znaleziono wyceny', { status: 404 });

                const quote: any = quotes.docs[0];
                const brief: any = quote.brief;
                if (!quote.maintenancePrice || quote.maintenancePrice <= 0 || !brief || typeof brief !== 'object') {
                    return new Response('Subskrypcja nie jest dostępna dla tej wyceny.', { status: 400 });
                }
                // Subskrypcja już działa — zamiast drugiej płatności kierujemy do portalu zarządzania.
                if (quote.subscriptionStatus === 'active' && quote.stripeCustomerId) {
                    return Response.redirect(`${getCmsPublicUrl()}/api/quotes/subscription-portal/${token}`, 303);
                }

                try {
                    const session = await createStripeSession({
                        mode: 'subscription',
                        // Płatności cykliczne: tylko karta (BLIK/P24 nie wspierają subskrypcji).
                        payment_method_types: ['card'],
                        line_items: [{
                            price_data: {
                                currency: 'pln',
                                recurring: { interval: 'month' },
                                product_data: {
                                    name: `Utrzymanie i opieka techniczna — ${brief.company}`,
                                    ...(quote.maintenanceDescription
                                        ? { description: String(quote.maintenanceDescription).slice(0, 500) }
                                        : {}),
                                },
                                unit_amount: Math.round(quote.maintenancePrice * 100),
                            },
                            quantity: 1,
                        }],
                        customer_email: brief.clientEmail,
                        ...invoiceDataCollection,
                        // Metadata na subskrypcji — webhook invoice.paid odczytuje z niej quoteId.
                        subscription_data: {
                            metadata: {
                                quoteId: String(quote.id),
                                briefId: String(brief.id),
                            }
                        },
                        metadata: {
                            quoteId: String(quote.id),
                            briefId: String(brief.id),
                            paymentModel: 'subscription',
                        },
                        success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:4321/dziekujemy?session_id={CHECKOUT_SESSION_ID}',
                        cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:4321/blad-platnosci',
                    });

                    if (!session.url) throw new Error('Stripe nie zwrócił URL sesji.');
                    return Response.redirect(session.url, 303);
                } catch (error: any) {
                    console.error('[Quotes subscribe] Błąd tworzenia sesji subskrypcji:', error?.message || error);
                    return new Response('Nie udało się rozpocząć subskrypcji. Spróbuj ponownie później.', { status: 500 });
                }
            }
        },
        {
            // Link z maila "Opłać II ratę" — świeża sesja Stripe na pozostałe 50%
            // (sesje wygasają po 24h, dlatego mail linkuje tutaj).
            path: '/pay-final/:token',
            method: 'get',
            handler: async (req) => {
                if (isRateLimited(req.headers as Headers, { key: 'quote-pay-final', limit: 10, windowMs: 10 * 60 * 1000 })) {
                    return new Response('Zbyt wiele żądań. Spróbuj ponownie później.', { status: 429 });
                }
                const token = req.routeParams?.token;
                if (!token) return new Response('Brak tokenu', { status: 400 });

                const quotes = await req.payload.find({
                    collection: 'quotes',
                    where: { quoteToken: { equals: token } },
                    limit: 1,
                    depth: 1
                });
                if (quotes.docs.length === 0) return new Response('Nie znaleziono wyceny', { status: 404 });

                const quote: any = quotes.docs[0];
                const brief: any = quote.brief;
                if (!quote.totalPrice || !brief || typeof brief !== 'object') {
                    return new Response('Brak danych do płatności.', { status: 400 });
                }
                if (quote.paymentStatus === 'paid_full') {
                    return new Response('Zamówienie jest już w pełni opłacone. Dziękujemy!', { status: 200 });
                }
                if (quote.paymentStatus !== 'paid_half') {
                    return new Response('Płatność II raty będzie dostępna po zaksięgowaniu I raty.', { status: 400 });
                }

                const remaining = quote.totalPrice - Math.round(quote.totalPrice / 2);

                try {
                    const session = await createStripeSession({
                        mode: 'payment',
                        payment_method_types: ['card', 'blik', 'p24'],
                        line_items: [{
                            price_data: {
                                currency: 'pln',
                                product_data: {
                                    name: `Wycena Projektu — ${brief.company}`,
                                    description: `II Rata (płatność końcowa) — ${brief.company}`
                                },
                                unit_amount: Math.round(remaining * 100)
                            },
                            quantity: 1,
                        }],
                        customer_email: brief.clientEmail,
                        ...invoiceDataCollection,
                        metadata: {
                            quoteId: String(quote.id),
                            briefId: String(brief.id),
                            paymentModel: 'final50',
                        },
                        success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:4321/dziekujemy?session_id={CHECKOUT_SESSION_ID}',
                        cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:4321/blad-platnosci',
                    });

                    if (!session.url) throw new Error('Stripe nie zwrócił URL sesji.');
                    return Response.redirect(session.url, 303);
                } catch (error: any) {
                    console.error('[Quotes pay-final] Błąd tworzenia sesji II raty:', error?.message || error);
                    return new Response('Nie udało się rozpocząć płatności. Spróbuj ponownie później.', { status: 500 });
                }
            }
        },
        {
            // Stripe Billing Portal — klient samodzielnie zarządza subskrypcją
            // (anulowanie, zmiana karty, historia faktur).
            path: '/subscription-portal/:token',
            method: 'get',
            handler: async (req) => {
                if (isRateLimited(req.headers as Headers, { key: 'quote-portal', limit: 10, windowMs: 10 * 60 * 1000 })) {
                    return new Response('Zbyt wiele żądań. Spróbuj ponownie później.', { status: 429 });
                }
                const token = req.routeParams?.token;
                if (!token) return new Response('Brak tokenu', { status: 400 });

                const quotes = await req.payload.find({
                    collection: 'quotes',
                    where: { quoteToken: { equals: token } },
                    limit: 1
                });
                if (quotes.docs.length === 0) return new Response('Nie znaleziono wyceny', { status: 404 });

                const quote: any = quotes.docs[0];
                if (!quote.stripeCustomerId) {
                    return new Response('Subskrypcja nie została jeszcze aktywowana — najpierw skorzystaj z linku aktywacyjnego.', { status: 404 });
                }

                try {
                    const returnUrl = (process.env.FRONTEND_URL || 'https://nobelion.pl').replace(/\/$/, '');
                    const portal = await createBillingPortalSession(quote.stripeCustomerId, returnUrl);
                    return Response.redirect(portal.url, 303);
                } catch (error: any) {
                    console.error('[Quotes portal] Błąd tworzenia sesji portalu:', error?.message || error);
                    return new Response('Nie udało się otworzyć panelu subskrypcji. Spróbuj ponownie później.', { status: 500 });
                }
            }
        }
    ],
    timestamps: true
};
