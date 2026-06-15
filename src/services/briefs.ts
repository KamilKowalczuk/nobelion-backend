import Stripe from 'stripe';
import { randomBytes } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2026-04-22.dahlia' });

export const generateToken = () => {
    return randomBytes(16).toString('hex');
};

// Publiczny adres CMS — używany w linkach mailowych do endpointów /api/quotes/*.
export const getCmsPublicUrl = (): string => {
    const url = process.env.CMS_PUBLIC_URL
        || (process.env.NODE_ENV === 'production' ? 'https://admin.nobelion.pl' : 'http://localhost:3001');
    return url.replace(/\/$/, '');
};

// Wspólne pola checkoutu zbierające dane do faktury — identyczne dla płatności
// jednorazowych i subskrypcji. Nazwa firmy i NIP jako własne custom_fields
// (Stripe billing "name" to imię i nazwisko osoby, NIE nazwa firmy; tax_id
// wymaga prefiksu kraju "PL..."). Oba opcjonalne — nabywcą bywa osoba prywatna.
export const invoiceDataCollection = {
    billing_address_collection: 'required',
    phone_number_collection: { enabled: true },
    custom_fields: [
        {
            key: 'company_name',
            label: { type: 'custom', custom: 'Nazwa firmy (do faktury)' },
            type: 'text',
            text: { minimum_length: 2, maximum_length: 200 },
            optional: true,
        },
        {
            key: 'nip',
            label: { type: 'custom', custom: 'NIP do faktury (firma)' },
            type: 'text',
            text: { minimum_length: 10, maximum_length: 15 },
            optional: true,
        },
    ],
} satisfies Partial<Stripe.Checkout.SessionCreateParams>;

export const createStripeSession = async (params: any) => {
    return await stripe.checkout.sessions.create(params);
};

// Sesja Stripe Billing Portal — klient sam zarządza subskrypcją (w tym anulowanie).
export const createBillingPortalSession = async (customerId: string, returnUrl: string) => {
    return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
};
