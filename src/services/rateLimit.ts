//
// Lekki rate limiter (fixed-window, in-memory) dla publicznych endpointów Payload.
// Ochrona przed burstami z jednej instancji; dla twardych limitów użyj WAF/reverse-proxy.
//

type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

function clientIp(headers: Headers): string {
    return (
        headers.get('x-nf-client-connection-ip') ||
        (headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
        (headers.get('x-real-ip') || '') ||
        'unknown'
    );
}

/** true = limit przekroczony (odrzuć żądanie). */
export function isRateLimited(
    headers: Headers,
    opts: { key: string; limit: number; windowMs: number }
): boolean {
    const id = `${opts.key}:${clientIp(headers)}`;
    const now = Date.now();
    const b = store.get(id);

    if (!b || now > b.reset) {
        store.set(id, { count: 1, reset: now + opts.windowMs });
        return false;
    }
    b.count++;
    if (store.size > 5000) {
        for (const [k, v] of store) if (now > v.reset) store.delete(k);
    }
    return b.count > opts.limit;
}
