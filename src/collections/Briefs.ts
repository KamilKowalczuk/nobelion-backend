import type { CollectionConfig } from 'payload';
import { sendQuoteEmail, sendInternalChangeRequestEmail } from '../services/email';
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
            name: 'projectPlan',
            type: 'richText',
            label: 'Plan prac i Technologie',
            admin: {
                description: 'Opisz w jaki sposób zostanie zrealizowany projekt, użyte technologie i etapy.'
            }
        },
        {
            name: 'monthlyMaintenancePrice',
            type: 'number',
            label: 'Miesięczny koszt utrzymania (PLN netto)',
            admin: {
                description: 'Podaj kwotę jeśli projekt obejmuje opcjonalne utrzymanie.',
                position: 'sidebar'
            }
        },
        {
            name: 'maintenanceDescription',
            type: 'textarea',
            label: 'Opis utrzymania',
            admin: {
                description: 'Co wchodzi w skład utrzymania miesięcznego? (np. 10 roboczogodzin, SLA 24h, monitoring).'
            }
        },
        {
            name: 'changeRequests',
            type: 'array',
            label: 'Prośby o poprawki od klienta',
            admin: {
                readOnly: true,
            },
            fields: [
                { name: 'message', type: 'textarea', label: 'Wiadomość od klienta' },
                { name: 'date', type: 'date', label: 'Data prośby' }
            ]
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
                { label: 'Oczekuje na poprawki klienta', value: 'change_requested' },
                { label: 'Wygrany', value: 'won' },
                { label: 'Przegrany', value: 'lost' }
            ]
        },
        { name: 'source', type: 'text', label: 'Źródło', defaultValue: 'brief-form' }
    ],
    hooks: {
        beforeChange: [
            async ({ data, req, operation, originalDoc }) => {
                try {
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
                } catch (err) {
                    console.error('[Briefs Hook Error]:', err);
                    throw err;
                }
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
                    quoteToken: brief.quoteToken,
                    projectPlan: brief.projectPlan,
                    monthlyMaintenancePrice: brief.monthlyMaintenancePrice,
                    maintenanceDescription: brief.maintenanceDescription
                });
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

                const briefs = await req.payload.find({
                    collection: 'briefs',
                    where: { quoteToken: { equals: token } },
                    limit: 1
                });

                if (briefs.docs.length === 0) {
                    return Response.json({ error: 'Wycena nie znaleziona' }, { status: 404 });
                }

                const brief = briefs.docs[0];
                const existingRequests = brief.changeRequests || [];

                await req.payload.update({
                    collection: 'briefs',
                    id: brief.id,
                    data: {
                        status: 'change_requested',
                        changeRequests: [
                            ...existingRequests,
                            {
                                message: body.message,
                                date: new Date().toISOString()
                            }
                        ]
                    }
                });

                // Wysłanie powiadomienia e-mail
                await sendInternalChangeRequestEmail({ company: brief.company, message: body.message });

                return Response.json({ success: true });
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

                const amountToCharge = is50Percent ? Math.round(brief.proposedPrice / 2) : Math.round(brief.proposedPrice * 0.9);
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
