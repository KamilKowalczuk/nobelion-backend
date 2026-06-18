import crypto from 'crypto';
import type { CollectionBeforeChangeHook } from 'payload';
import { sendQuoteEmail, sendSubscriptionEmail, sendFinalPaymentEmail } from '../services/email';
import { getCmsPublicUrl } from '../services/briefs';
import { PaymentStatus, QuoteStatus } from '../constants/quotes';

export const quoteBeforeChangeHook: CollectionBeforeChangeHook = async ({ data, req, originalDoc }) => {
    // Ochrona przed nadpisywaniem nowszych danych przez zdezaktualizowany widok w panelu Admina
    if (originalDoc && req.user) {
        if (originalDoc.paymentStatus && originalDoc.paymentStatus !== PaymentStatus.UNPAID && data.paymentStatus === PaymentStatus.UNPAID) {
            data.paymentStatus = originalDoc.paymentStatus;
        }
        if (originalDoc.orderId && !data.orderId) {
            data.orderId = originalDoc.orderId;
        }
        if (originalDoc.consent?.acceptedAt && !data.consent?.acceptedAt) {
            data.consent = originalDoc.consent;
        }
    }

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
        if (data.status === QuoteStatus.DRAFT) data.status = QuoteStatus.SENT;
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
        if (data.paymentStatus !== PaymentStatus.PAID_HALF) {
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
};
