import type { PayloadRequest } from 'payload';
import { sendInternalChangeRequestEmail } from './email';

export async function getClientQuote(req: PayloadRequest, token: string) {
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

    const q: any = quote;
    const brief: any = (typeof q.brief === 'object' && q.brief !== null) ? q.brief : {};
    return Response.json({
        status: q.status,
        paymentStatus: q.paymentStatus ?? 'unpaid',
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

export async function updateClientMaintenance(req: PayloadRequest, token: string, wantsMaintenance: boolean) {
    if (!token) return Response.json({ error: 'Brak tokenu' }, { status: 400 });

    const quotes = await req.payload.find({
        collection: 'quotes',
        where: { quoteToken: { equals: token } },
        limit: 1
    });
    if (quotes.docs.length === 0) return Response.json({ error: 'Wycena nie znaleziona' }, { status: 404 });

    await req.payload.update({
        collection: 'quotes',
        id: quotes.docs[0].id,
        data: { clientSelectedMaintenance: Boolean(wantsMaintenance) }
    });

    return Response.json({ success: true });
}

export async function requestClientChange(req: PayloadRequest, token: string, messageRaw: any) {
    if (!token) return Response.json({ error: 'Brak tokenu' }, { status: 400 });

    const message = typeof messageRaw === 'string' ? messageRaw.trim() : '';
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
