import type { CollectionConfig } from 'payload';
import { sendQuoteEmail } from '../services/email';
import { generateToken, createStripeSession } from '../services/briefs';

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
        // --- Wycena (admin) ---
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
            label: 'Data wysyłki wyceny',
            admin: { readOnly: true, position: 'sidebar' } 
        },
        {
            name: 'quoteToken',
            type: 'text',
            label: 'Token wyceny',
            unique: true,
            admin: { readOnly: true, position: 'sidebar' }
        },
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
                { label: 'Wygrany', value: 'won' },
                { label: 'Przegrany', value: 'lost' }
            ]
        },
        { name: 'source', type: 'text', label: 'Źródło', defaultValue: 'brief-form' }
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
                        to: data.clientEmail,
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
                        customer_email: brief.clientEmail,
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
