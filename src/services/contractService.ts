import { generateContractPdf } from './pdfGenerator';
import { Payload } from 'payload';

export async function processContractForQuote(quote: any, payload: Payload): Promise<{ pdfBuffer: Buffer, filename: string } | null> {
    if (quote.consent?.generatedContractPdf) return null; // Już wygenerowano
    if (!quote.consent?.documents?.items || !quote.consent?.acceptedAt) return null; // Brak zgód

    const acceptedDocs = quote.consent.documents.items;
    const umowaConsent = acceptedDocs.find((d: any) => d.docType === 'umowa-wspolpracy');
    if (!umowaConsent || !umowaConsent.contentHash) return null;

    // Pobierz historyczną wersję umowy
    const docVersions = await payload.find({
        collection: 'document-versions',
        where: {
            contentHash: { equals: umowaConsent.contentHash },
            docType: { equals: 'umowa-wspolpracy' }
        },
        limit: 1
    });

    let markdownContent = '';
    if (docVersions.docs.length > 0) {
        markdownContent = docVersions.docs[0].content as string;
    } else {
        // Fallback do aktualnej wersji (nie powinno wystąpić)
        const currentDoc = await payload.find({
            collection: 'documents',
            where: { docType: { equals: 'umowa-wspolpracy' } },
            limit: 1
        });
        if (currentDoc.docs.length > 0) markdownContent = currentDoc.docs[0].content as string;
    }

    if (!markdownContent) return null;

    // Pobierz powiązany Brief
    let brief = quote.brief;
    if (typeof brief === 'number' || typeof brief === 'string') {
        brief = await payload.findByID({ collection: 'briefs', id: brief });
    }

    // Znalezienie wybranego modelu
    let paymentModelLabel = 'Płatność jednorazowa z rabatem 10%';
    let paymentScheduleDetails = `Opłacono w całości kwotę ${Math.round(quote.totalPrice * 0.9)} PLN netto.`;
    if (quote.paymentStatus === 'paid_half') {
        paymentModelLabel = 'Płatność podzielona 50/50';
        paymentScheduleDetails = `Opłacono I ratę w wysokości ${Math.round(quote.totalPrice / 2)} PLN netto. Druga rata płatna po wdrożeniu.`;
    }

    const subscriptionStatus = quote.clientSelectedMaintenance
        ? `TAK — ${quote.maintenancePrice} PLN netto / mc, rozpoczęcie po końcowym odbiorze`
        : `NIE wybrano`;

    // Ustawienie Part III w divie certyfikatu
    const certIndex = markdownContent.indexOf('# CZĘŚĆ III — CERTYFIKAT AKCEPTACJI');
    if (certIndex !== -1) {
        markdownContent = markdownContent.substring(0, certIndex) + '\\n<div class="certificate-section">\\n' + markdownContent.substring(certIndex) + '\\n</div>';
    }

    const dataParams = {
        CLIENT_NAME: brief.company || 'Klient',
        CLIENT_ADDRESS: `${brief.street || ''}, ${brief.postalCode || ''} ${brief.city || ''}`,
        CLIENT_TAX_ID_LINE: brief.nip ? `NIP: ${brief.nip}` : 'Konsument',
        CLIENT_REPRESENTATIVE_LINE: brief.nip ? `reprezentowana przez upoważnioną osobę` : '',
        QUOTE_ID: String(quote.id),
        ORDER_ID: quote.orderId ? String(typeof quote.orderId === 'object' ? quote.orderId.id : quote.orderId) : 'W trakcie',
        SCOPE_SUMMARY: `Wdrożenie systemu wg wyceny "${quote.title || 'Nobelion'}"`,
        TOTAL_PRICE: quote.totalPrice,
        PAYMENT_MODEL_LABEL: paymentModelLabel,
        PAYMENT_SCHEDULE_DETAILS: paymentScheduleDetails,
        SUBSCRIPTION_STATUS: subscriptionStatus,
        SIGNER_NAME: brief.clientName || brief.company || 'Klient',
        SIGNER_EMAIL: quote.consent.email,
        SIGNER_ROLE: brief.nip ? 'Reprezentant firmy' : 'Osoba prywatna',
        ACCEPTANCE_TIMESTAMP: new Date(quote.consent.acceptedAt).toLocaleString('pl-PL'),
        IP_ADDRESS: quote.consent.ip,
        CONTRACT_VERSION: umowaConsent.version || '1',
        STRIPE_SESSION_ID: 'Zaksięgowano z użyciem Stripe'
    };

    const pdfBuffer = await generateContractPdf(markdownContent, dataParams);
    const filename = `Umowa_Wspolpracy_Nobelion_${quote.id}.pdf`;

    // Zapisz w Media
    const mediaDoc = await payload.create({
        collection: 'media',
        data: {
            alt: `Umowa ${filename}`,
        },
        file: {
            data: pdfBuffer,
            mimetype: 'application/pdf',
            name: filename,
            size: pdfBuffer.length
        }
    });

    // Zaktualizuj Quote (musimy dodać pole generatedContractPdf do Quotes.ts)
    await payload.update({
        collection: 'quotes',
        id: quote.id,
        data: {
            // @ts-ignore - pole zaraz dodamy w konfiguracji
            'consent.generatedContractPdf': mediaDoc.id
        }
    });

    // Zwróć plik aby nadrzędny kod mógł go dodać do załączników Stripe Webhooka
    return { pdfBuffer, filename };
}
