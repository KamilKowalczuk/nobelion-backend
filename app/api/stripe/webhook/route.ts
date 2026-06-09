import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getPayload } from 'payload';
import configPromise from '../../../../payload.config';
import { issueInvoice } from '../../../../src/services/fakturaxl';
import { sendPaymentConfirmation } from '../../../../src/services/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-04-22.dahlia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    if (!webhookSecret) throw new Error('Brak STRIPE_WEBHOOK_SECRET');
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const payload = await getPayload({ config: configPromise });

    // ── Idempotencja: Stripe retry'uje webhooki. Bez tego powstają duplikaty
    //    zamówień i faktur. Dedup po stripeEventId.
    try {
      const existing = await payload.find({
        collection: 'orders',
        where: { stripeEventId: { equals: event.id } },
        limit: 1,
      });
      if (existing.docs.length > 0) {
        console.log(`[Stripe Webhook] Zdarzenie ${event.id} już przetworzone — pomijam.`);
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
      }
    } catch (e) {
      console.error('[Stripe Webhook] Błąd sprawdzania idempotencji:', e);
    }

    const briefId = session.metadata?.briefId;
    const quoteId = session.metadata?.quoteId;
    // Checkout ustawia paymentModel '50' | '100' (poprzednio czytano nieistniejące isFirstTranche).
    const isFirstTranche = session.metadata?.paymentModel === '50';

    const customerEmail = session.customer_details?.email || session.customer_email || '';
    const customerName = session.customer_details?.name || '';
    const customerPhone = session.customer_details?.phone || '';
    const addr = session.customer_details?.address;
    // NIP z naszego własnego custom_field (nie Stripe tax_id — tamto wymaga prefiksu kraju).
    const customerNip = (session.custom_fields?.find((f) => f.key === 'nip')?.text?.value || '').trim();
    const amountTotal = (session.amount_total || 0) / 100;
    const currency = session.currency || 'pln';

    let orderDoc;
    try {
      orderDoc = await payload.create({
        collection: 'orders',
        data: {
          briefId: briefId ? parseInt(briefId, 10) : undefined,
          stripeEventId: event.id,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string,
          amount: amountTotal,
          currency: currency.toUpperCase(),
          status: 'paid',
          customerEmail,
          billingName: customerName,
          billingPhone: customerPhone,
          billingCompanyName: customerName,
          billingNip: customerNip,
          billingStreet: addr?.line1 || '',
          billingCity: addr?.city || '',
          billingPostalCode: addr?.postal_code || '',
          billingCountry: addr?.country || '',
          payments: [
            {
              amount: amountTotal,
              paidAt: new Date().toISOString(),
              status: 'paid'
            }
          ]
        }
      });
      console.log(`[Stripe Webhook] Utworzono Order ID: ${orderDoc.id}`);

      if (quoteId) {
        const newPaymentStatus = isFirstTranche ? 'paid_half' : 'paid_full';
        await payload.update({
          collection: 'quotes',
          id: parseInt(quoteId, 10),
          data: { paymentStatus: newPaymentStatus, orderId: orderDoc.id }
        });
        console.log(`[Stripe Webhook] Zaktualizowano Wycenę ${quoteId} → ${newPaymentStatus}`);
      }
    } catch (e) {
      console.error(`[Stripe Webhook] Błąd tworzenia Order / aktualizacji Wyceny:`, e);
      return new Response('Błąd bazy danych', { status: 500 });
    }

    // Brandowane potwierdzenie płatności (faktura idzie osobno z FakturaXL).
    if (customerEmail) {
      try {
        await sendPaymentConfirmation({
          to: customerEmail,
          orderNumber: orderDoc.orderNumber || String(orderDoc.id),
          amount: amountTotal,
        });
      } catch (e) {
        console.error('[Stripe Webhook] Błąd wysyłki potwierdzenia płatności:', e);
      }
    }

    // Wystawienie faktury (FakturaXL sam wysyła PDF mailem do klienta).
    const description = isFirstTranche
      ? `Wycena Projektu - I Rata (50%)`
      : `Wycena Projektu - Całość`;

    const invoiceResult = await issueInvoice({
      email: customerEmail,
      companyName: customerName,
      nip: customerNip || undefined,
      street: addr?.line1 || undefined,
      postCode: addr?.postal_code || undefined,
      city: addr?.city || undefined,
      phone: customerPhone || undefined,
      amountGross: amountTotal,
      description
    });

    if (invoiceResult?.success && invoiceResult.invoiceId) {
      try {
        await payload.update({
          collection: 'orders',
          id: orderDoc.id,
          data: {
            payments: [
              {
                amount: amountTotal,
                paidAt: new Date().toISOString(),
                status: 'paid',
                fakturaXlInvoiceId: invoiceResult.invoiceNumber || invoiceResult.invoiceId,
                invoiceStatus: 'sent'
              }
            ]
          }
        });
      } catch (e) {
        console.error(`[Stripe Webhook] Błąd aktualizacji faktury w Order:`, e);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
