import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getPayload } from 'payload';
import configPromise from '../../../../payload.config';
import { issueInvoice } from '../../../../src/services/fakturaxl';

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
    
    // Pobranie Payload CMS instance
    const payload = await getPayload({ config: configPromise });

    const briefId = session.metadata?.briefId;
    const paymentModel = session.metadata?.paymentModel;
    const isFirstTranche = session.metadata?.isFirstTranche === 'true';

    const customerEmail = session.customer_details?.email || session.customer_email || '';
    const customerName = session.customer_details?.name || '';
    const amountTotal = (session.amount_total || 0) / 100; // Grosze na PLN
    const currency = session.currency || 'pln';

    // Utworzenie zamówienia w CMS
    let orderDoc;
    try {
      orderDoc = await payload.create({
        collection: 'orders',
        data: {
          briefId: briefId ? parseInt(briefId, 10) : undefined, // Zakładamy int ID, ew. rzutowanie
          stripeEventId: event.id,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string,
          amount: amountTotal,
          currency: currency.toUpperCase(),
          status: 'paid',
          customerEmail,
          billingName: customerName,
          // Można tu wyciągnąć dodatkowe pola jeśli Stripe zbiera NIP (tax_ids)
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
    } catch (e) {
      console.error(`[Stripe Webhook] Błąd tworzenia Order:`, e);
      return new Response('Błąd bazy danych', { status: 500 });
    }

    // Wystawienie Faktury
    const description = isFirstTranche 
        ? `Wycena Projektu - I Rata (50%)` 
        : `Wycena Projektu - Całość`;

    const invoiceResult = await issueInvoice({
        email: customerEmail,
        companyName: customerName,
        amountGross: amountTotal,
        description: description
    });

    if (invoiceResult?.success && invoiceResult.invoiceId) {
        // Zaktualizuj zamówienie dodając informację o fakturze
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
