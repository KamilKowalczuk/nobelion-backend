import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getPayload, type Payload } from 'payload';
import configPromise from '../../../../payload.config';
import { issueInvoice } from '../../../../src/services/fakturaxl';
import { sendPaymentConfirmation, sendSubscriptionCanceledEmail } from '../../../../src/services/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-04-22.dahlia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Idempotencja: Stripe retry'uje webhooki — bez dedupu po stripeEventId
// powstają duplikaty zamówień i faktur.
async function isDuplicateEvent(payload: Payload, eventId: string): Promise<boolean> {
  try {
    const existing = await payload.find({
      collection: 'orders',
      where: { stripeEventId: { equals: eventId } },
      limit: 1,
    });
    if (existing.docs.length > 0) {
      console.log(`[Stripe Webhook] Zdarzenie ${eventId} już przetworzone — pomijam.`);
      return true;
    }
  } catch (e) {
    console.error('[Stripe Webhook] Błąd sprawdzania idempotencji:', e);
  }
  return false;
}

// ── Płatność jednorazowa (wycena: 50% / 100%) ────────────────────────────────
async function handleOneOffPayment(payload: Payload, event: Stripe.Event): Promise<Response> {
  const session = event.data.object as Stripe.Checkout.Session;

  const briefId = session.metadata?.briefId;
  const quoteId = session.metadata?.quoteId;

  // ── Filtr własności ──
  // Konto Stripe bywa współdzielone z innymi projektami, a webhook dostaje
  // zdarzenia z CAŁEGO konta. Nasze sesje zawsze niosą briefId/quoteId
  // w metadata — wszystko inne ignorujemy (żadnych zamówień ani faktur).
  if (!briefId && !quoteId) {
    console.log(`[Stripe Webhook] Sesja ${session.id} bez metadanych Nobelion — zdarzenie innego projektu, pomijam.`);
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }

  if (await isDuplicateEvent(payload, event.id)) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }
  // paymentModel: '50' = I rata, 'final50' = II rata (końcowa), '100' = całość z rabatem.
  const paymentModel = session.metadata?.paymentModel;
  const isFirstTranche = paymentModel === '50';

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
    : paymentModel === 'final50'
      ? `Wycena Projektu - II Rata (płatność końcowa)`
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

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

// ── Aktywacja subskrypcji (checkout mode=subscription) ──────────────────────
// Zamówienia NIE tworzymy tutaj — każdą płatność (w tym pierwszą) rejestruje
// zdarzenie invoice.paid, więc Order powstaje dokładnie raz na płatność.
// Zapisujemy za to snapshot danych do faktury (NIP, adres) z checkoutu —
// kolejne odnowienia subskrypcji nie niosą już tych danych.
async function handleSubscriptionActivated(payload: Payload, session: Stripe.Checkout.Session): Promise<Response> {
  const quoteId = session.metadata?.quoteId;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (!quoteId) {
    // Subskrypcja bez naszych metadanych = inny projekt na tym samym koncie Stripe.
    console.log(`[Stripe Webhook] Subskrypcja z sesji ${session.id} bez quoteId — zdarzenie innego projektu, pomijam.`);
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }

  const addr = session.customer_details?.address;
  const nip = (session.custom_fields?.find((f) => f.key === 'nip')?.text?.value || '').trim();

  try {
    await payload.update({
      collection: 'quotes',
      id: parseInt(quoteId, 10),
      data: {
        subscriptionStatus: 'active',
        stripeSubscriptionId: subscriptionId || '',
        stripeCustomerId: customerId || '',
        clientSelectedMaintenance: true,
        subscriptionBilling: {
          companyName: session.customer_details?.name || '',
          nip,
          street: addr?.line1 || '',
          city: addr?.city || '',
          postalCode: addr?.postal_code || '',
          phone: session.customer_details?.phone || '',
        },
      }
    });
    console.log(`[Stripe Webhook] Subskrypcja aktywna dla Wyceny ${quoteId} (${subscriptionId}).`);
  } catch (e) {
    console.error('[Stripe Webhook] Błąd aktywacji subskrypcji w Wycenie:', e);
    return new Response('Błąd bazy danych', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

// Stripe od wersji Basil przenosi dane subskrypcji na invoice.parent — czytamy oba kształty.
function extractSubscriptionInfo(invoice: Stripe.Invoice): { subscriptionId: string | null, metadata: Record<string, string> } {
  const inv = invoice as any;
  const direct = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
  const fromParent = inv.parent?.subscription_details?.subscription;
  const subscriptionId = direct || (typeof fromParent === 'string' ? fromParent : fromParent?.id) || null;
  const metadata = inv.subscription_details?.metadata || inv.parent?.subscription_details?.metadata || {};
  return { subscriptionId, metadata };
}

// ── Płatność cykliczna (invoice.paid) → Order ────────────────────────────────
async function handleSubscriptionInvoicePaid(payload: Payload, event: Stripe.Event): Promise<Response> {
  const invoice = event.data.object as Stripe.Invoice;
  const { subscriptionId, metadata } = extractSubscriptionInfo(invoice);

  // Interesują nas wyłącznie faktury subskrypcyjne.
  if (!subscriptionId) {
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }

  if (await isDuplicateEvent(payload, event.id)) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  // Wycena: najpierw metadata subskrypcji, fallback po stripeSubscriptionId.
  let quote: any = null;
  try {
    if (metadata.quoteId) {
      quote = await payload.findByID({ collection: 'quotes', id: parseInt(metadata.quoteId, 10), depth: 0 }).catch(() => null);
    }
    if (!quote) {
      const found = await payload.find({
        collection: 'quotes',
        where: { stripeSubscriptionId: { equals: subscriptionId } },
        limit: 1,
        depth: 0,
      });
      quote = found.docs[0] || null;
    }
  } catch (e) {
    console.error('[Stripe Webhook] Błąd wyszukiwania wyceny dla subskrypcji:', e);
  }

  // ── Filtr własności ── brak naszych metadanych i brak wyceny powiązanej
  // z tą subskrypcją = płatność innego projektu na wspólnym koncie Stripe.
  if (!metadata.quoteId && !quote) {
    console.log(`[Stripe Webhook] Faktura subskrypcji ${subscriptionId} bez powiązania z Nobelion — zdarzenie innego projektu, pomijam.`);
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }

  const amountPaid = (invoice.amount_paid || 0) / 100;
  const briefId = metadata.briefId
    ? parseInt(metadata.briefId, 10)
    : (quote && typeof quote.brief === 'number' ? quote.brief : undefined);

  // ── Dane nabywcy do faktury ──
  // Źródło 1: snapshot z checkoutu subskrypcji (zapisany przy aktywacji).
  // Źródło 2 (fallback): ostatnie zamówienie tego briefu z uzupełnionym NIP-em
  // (np. płatność projektowa 50%/100% sprzed subskrypcji).
  let billing = {
    companyName: quote?.subscriptionBilling?.companyName || '',
    nip: quote?.subscriptionBilling?.nip || '',
    street: quote?.subscriptionBilling?.street || '',
    city: quote?.subscriptionBilling?.city || '',
    postalCode: quote?.subscriptionBilling?.postalCode || '',
    phone: quote?.subscriptionBilling?.phone || '',
  };
  if (!billing.nip && briefId) {
    try {
      const previousOrders = await payload.find({
        collection: 'orders',
        where: {
          and: [
            { briefId: { equals: briefId } },
            { billingNip: { not_equals: '' } },
          ]
        },
        sort: '-createdAt',
        limit: 1,
        depth: 0,
      });
      const prev: any = previousOrders.docs[0];
      if (prev) {
        billing = {
          companyName: billing.companyName || prev.billingCompanyName || prev.billingName || '',
          nip: prev.billingNip || '',
          street: billing.street || prev.billingStreet || '',
          city: billing.city || prev.billingCity || '',
          postalCode: billing.postalCode || prev.billingPostalCode || '',
          phone: billing.phone || prev.billingPhone || '',
        };
      }
    } catch (e) {
      console.error('[Stripe Webhook] Błąd pobierania danych nabywcy z poprzednich zamówień:', e);
    }
  }

  const customerEmail = invoice.customer_email || '';
  const customerName = billing.companyName || invoice.customer_name || '';

  let orderDoc;
  try {
    orderDoc = await payload.create({
      collection: 'orders',
      data: {
        briefId,
        stripeEventId: event.id,
        stripeSessionId: subscriptionId,
        amount: amountPaid,
        currency: (invoice.currency || 'pln').toUpperCase(),
        status: 'paid',
        customerEmail,
        billingName: invoice.customer_name || customerName,
        billingPhone: billing.phone,
        billingCompanyName: customerName,
        billingNip: billing.nip,
        billingStreet: billing.street,
        billingCity: billing.city,
        billingPostalCode: billing.postalCode,
        payments: [
          {
            stripeInvoiceId: invoice.id,
            amount: amountPaid,
            paidAt: new Date().toISOString(),
            status: 'paid'
          }
        ]
      }
    });
    console.log(`[Stripe Webhook] Płatność subskrypcyjna → Order ${orderDoc.id} (${amountPaid} PLN, subskrypcja ${subscriptionId}).`);
  } catch (e) {
    console.error('[Stripe Webhook] Błąd zapisu płatności subskrypcyjnej:', e);
    return new Response('Błąd bazy danych', { status: 500 });
  }

  // ── Faktura FakturaXL (vat=zw) za każdą płatność cykliczną ──
  // FakturaXL sam wysyła PDF mailem do klienta.
  const invoiceResult = await issueInvoice({
    email: customerEmail,
    companyName: customerName || undefined,
    nip: billing.nip || undefined,
    street: billing.street || undefined,
    postCode: billing.postalCode || undefined,
    city: billing.city || undefined,
    phone: billing.phone || undefined,
    amountGross: amountPaid,
    description: 'Utrzymanie i opieka techniczna — abonament miesięczny'
  });

  try {
    await payload.update({
      collection: 'orders',
      id: orderDoc.id,
      data: {
        payments: [
          {
            stripeInvoiceId: invoice.id,
            amount: amountPaid,
            paidAt: new Date().toISOString(),
            status: 'paid',
            fakturaXlInvoiceId: invoiceResult?.success
              ? (invoiceResult.invoiceNumber || invoiceResult.invoiceId)
              : undefined,
            invoiceStatus: invoiceResult?.success ? 'sent' : 'error'
          }
        ]
      }
    });
  } catch (e) {
    console.error('[Stripe Webhook] Błąd aktualizacji faktury w Order (subskrypcja):', e);
  }

  if (!invoiceResult?.success) {
    console.error(`[Stripe Webhook] Faktura za płatność subskrypcyjną NIE została wystawiona (Order ${orderDoc.id}).`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

// ── Anulowanie subskrypcji → status w panelu + mail wewnętrzny ───────────────
async function handleSubscriptionCanceled(payload: Payload, subscription: Stripe.Subscription): Promise<Response> {
  let quote: any = null;
  try {
    const found = await payload.find({
      collection: 'quotes',
      where: { stripeSubscriptionId: { equals: subscription.id } },
      limit: 1,
      depth: 1,
    });
    quote = found.docs[0] || null;
  } catch (e) {
    console.error('[Stripe Webhook] Błąd wyszukiwania wyceny po subskrypcji:', e);
  }

  if (!quote) {
    // Brak wyceny z tym ID subskrypcji = subskrypcja innego projektu na wspólnym koncie.
    console.log(`[Stripe Webhook] Anulowana subskrypcja ${subscription.id} bez powiązanej wyceny — pomijam.`);
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }

  // Stripe potrafi powtórzyć zdarzenie — drugi raz nie aktualizujemy i nie mailujemy.
  if (quote.subscriptionStatus === 'canceled') {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  try {
    await payload.update({
      collection: 'quotes',
      id: quote.id,
      data: { subscriptionStatus: 'canceled', clientSelectedMaintenance: false }
    });
    console.log(`[Stripe Webhook] Subskrypcja ${subscription.id} anulowana — Wycena ${quote.id} zaktualizowana.`);
  } catch (e) {
    console.error('[Stripe Webhook] Błąd aktualizacji statusu subskrypcji:', e);
    return new Response('Błąd bazy danych', { status: 500 });
  }

  const brief: any = typeof quote.brief === 'object' && quote.brief !== null ? quote.brief : {};
  try {
    await sendSubscriptionCanceledEmail({
      company: brief.company || quote.title || `Wycena #${quote.id}`,
      customerEmail: brief.clientEmail || '',
    });
  } catch (e) {
    console.error('[Stripe Webhook] Błąd wysyłki maila o anulowaniu:', e);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

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

  const payload = await getPayload({ config: configPromise });

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      return session.mode === 'subscription'
        ? handleSubscriptionActivated(payload, session)
        : handleOneOffPayment(payload, event);
    }
    case 'invoice.paid':
      return handleSubscriptionInvoicePaid(payload, event);
    case 'customer.subscription.deleted':
      return handleSubscriptionCanceled(payload, event.data.object as Stripe.Subscription);
    default:
      return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
}
