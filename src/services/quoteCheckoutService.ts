import type { PayloadRequest } from 'payload';
import { createStripeSession, createBillingPortalSession, getCmsPublicUrl, invoiceDataCollection } from './briefs';

export async function processCheckout(req: PayloadRequest, token: string, body: any) {
    if (!token) return Response.json({ error: 'Brak tokenu' }, { status: 400 });

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

    if (quote.paymentStatus === 'paid_full') {
        return Response.json({ error: 'To zamówienie jest już w całości opłacone. Dziękujemy!' }, { status: 409 });
    }
    if (quote.paymentStatus === 'paid_half') {
        return Response.json({ error: 'I rata jest już opłacona. Link do płatności końcowej otrzymasz od nas mailem.' }, { status: 409 });
    }

    if (!quote.consent?.acceptedAt) {
        if (body.acceptTerms !== true || body.acceptAgreement !== true) {
            return Response.json({ error: 'Aby kontynuować, zaakceptuj regulamin, politykę prywatności oraz umowę współpracy.' }, { status: 400 });
        }
        try {
            const docsRes = await req.payload.find({ collection: 'documents', limit: 20, depth: 0 });
            const acceptedDocs = docsRes.docs
                .filter((d: any) => ['umowa-wspolpracy', 'regulamin', 'polityka-prywatnosci'].includes(d.docType))
                .map((d: any) => ({ docType: d.docType, version: d.version || '1', contentHash: d.contentHash || '' }));
            const hdrs = req.headers as Headers;
            const ip = hdrs.get('cf-connecting-ip')
                || (hdrs.get('x-forwarded-for') || '').split(',')[0].trim()
                || hdrs.get('x-real-ip')
                || '';
            await req.payload.update({
                collection: 'quotes',
                id: quote.id,
                data: {
                    consent: {
                        acceptedAt: new Date().toISOString(),
                        ip,
                        email: brief.clientEmail || '',
                        agreementAccepted: true,
                        documents: { acceptedTerms: true, acceptedAgreement: true, items: acceptedDocs },
                    }
                }
            });
        } catch (e: any) {
            console.error('[Quotes checkout] Błąd zapisu zgód:', e?.message || e);
            return Response.json({ error: 'Nie udało się zapisać akceptacji. Spróbuj ponownie.' }, { status: 500 });
        }
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
            ...invoiceDataCollection,
            metadata: {
                quoteId: String(quote.id),
                briefId: String(brief.id),
                paymentModel: is50Percent ? '50' : '100',
            }
        });

        return Response.json({ url: session.url });
    } catch (error: any) {
        console.error('[Quotes checkout] Błąd tworzenia sesji Stripe:', error?.message || error);
        return Response.json({ error: 'Nie udało się utworzyć sesji płatności. Spróbuj ponownie później.' }, { status: 500 });
    }
}

export async function processSubscribe(req: PayloadRequest, token: string) {
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
    if (quote.subscriptionStatus === 'active' && quote.stripeCustomerId) {
        return Response.redirect(`${getCmsPublicUrl()}/api/quotes/subscription-portal/${token}`, 303);
    }

    try {
        const session = await createStripeSession({
            mode: 'subscription',
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

export async function processPayFinal(req: PayloadRequest, token: string) {
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

export async function createPortalSession(req: PayloadRequest, token: string) {
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
