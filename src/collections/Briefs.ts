import type { CollectionConfig } from 'payload';
import { sendQuoteEmail } from '../services/email';
import { generateToken, createStripeSession } from '../services/briefs';

export const Briefs: CollectionConfig = {
    slug: 'briefs',
    admin: {
        useAsTitle: 'company',
        // defaultColumns: ['company', 'email', 'status', 'budget', 'urgency', 'createdAt']
    },
    access: {
        read: () => true, 
        create: () => true,
        update: () => true,
        delete: () => true,
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
        { 
            name: 'proposedPrice', 
            type: 'number', 
            label: 'Proponowana cena projektu (PLN netto)',
            admin: {
                position: 'sidebar'
            }
        },
        {
            name: 'triggerQuoteEmail',
            type: 'checkbox',
            label: 'Wyślij e-mail z wyceną i linkiem do płatności',
            admin: {
                position: 'sidebar',
                description: 'Po zaznaczeniu i zapisaniu, klient otrzyma email. Checkbox zostanie automatycznie odznaczony po wysyłce.'
            }
        },
        { 
            name: 'quoteSentAt', 
            type: 'date', 
            admin: { readOnly: true, position: 'sidebar' } 
        },
        {
            name: 'quoteToken',
            type: 'text',
            unique: true,
            admin: { readOnly: true, position: 'sidebar' }
        },
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
    hooks: {
        beforeChange: [
            async ({ data, req, operation, originalDoc }) => {
                // Wygeneruj bezpieczny token jeśli nie istnieje
                if (!data.quoteToken) {
                    data.quoteToken = generateToken();
                }

                // Jeśli zaznaczono checkbox do wysyłki maila, wyślij i zresetuj
                if (data.triggerQuoteEmail === true && data.proposedPrice) {
                    await sendQuoteEmail({
                        to: data.email,
                        companyName: data.company,
                        quoteAmount: data.proposedPrice,
                        briefId: data.quoteToken // Używamy tokenu do linku
                    });
                    
                    data.triggerQuoteEmail = false; // Reset checkboxa
                    data.quoteSentAt = new Date().toISOString(); // Zapisz czas wysyłki
                    
                    // Opcjonalnie zaktualizuj status na 'quoted' jeśli jest inny
                    if (data.status !== 'won' && data.status !== 'lost') {
                        data.status = 'quoted';
                    }
                }
                return data;
            }
        ]
    },
    endpoints: [
        {
            path: '/quote/:token',
            method: 'get',
            handler: async (req) => {
                const token = req.routeParams?.token;
                if (!token) return Response.json({ error: 'Brak tokenu' }, { status: 400 });

                const briefs = await req.payload.find({
                    collection: 'briefs',
                    where: { quoteToken: { equals: token } },
                    limit: 1
                });

                if (briefs.docs.length === 0) {
                    return Response.json({ error: 'Wycena nie znaleziona' }, { status: 404 });
                }

                const brief = briefs.docs[0];
                return Response.json({
                    id: brief.id,
                    company: brief.company,
                    problemDescription: brief.problemDescription,
                    proposedPrice: brief.proposedPrice,
                    quoteToken: brief.quoteToken
                });
            }
        },
        {
            path: '/checkout/:token',
            method: 'post',
            handler: async (req) => {
                const token = req.routeParams?.token;
                if (!token) return Response.json({ error: 'Brak tokenu' }, { status: 400 });

                // Zakładamy payload postaci { paymentModel: '100' | '50' }
                const body = await req.json();
                const is50Percent = body.paymentModel === '50';

                const briefs = await req.payload.find({
                    collection: 'briefs',
                    where: { quoteToken: { equals: token } },
                    limit: 1
                });

                if (briefs.docs.length === 0) {
                    return Response.json({ error: 'Wycena nie znaleziona' }, { status: 404 });
                }

                const brief = briefs.docs[0];
                if (!brief.proposedPrice) {
                    return Response.json({ error: 'Brak kwoty wyceny' }, { status: 400 });
                }

                const amountToCharge = is50Percent ? Math.round(brief.proposedPrice / 2) : brief.proposedPrice;
                const description = is50Percent 
                    ? `I Rata (50%) - Wycena projektu dla ${brief.company}` 
                    : `Opłata całościowa - Wycena projektu dla ${brief.company}`;

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
                        customer_email: brief.email,
                        metadata: {
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
