import { generateContractPdf } from './pdfGenerator';
import { Payload } from 'payload';

export async function processContractForQuote(quote: any, payload: Payload) {
    if (quote.consent?.generatedContractPdf) return; // Już wygenerowano
    if (!quote.consent?.documents?.items || !quote.consent?.acceptedAt) return; // Brak zgód

    const acceptedDocs = quote.consent.documents.items;
    const umowaConsent = acceptedDocs.find((d: any) => d.docType === 'umowa-wspolpracy');
    if (!umowaConsent || !umowaConsent.contentHash) return;

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

    if (!markdownContent) return;

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

    // Wyślij e-mail z PDF
    try {
        await payload.sendEmail({
            to: quote.consent.email,
            from: process.env.EMAIL_FROM || 'kontakt@nobelion.pl',
            subject: 'Twoja umowa i potwierdzenie rozpoczęcia prac — Nobelion',
            html: `
                <div style="font-family: sans-serif; color: #1e2330;">
                    <h2>Dziękujemy za zaufanie!</h2>
                    <p>Potwierdzamy, że opłata została zaksięgowana i prace nad Twoim projektem zostały oficjalnie rozpoczęte.</p>
                    <p>W załączniku znajdziesz spersonalizowany plik PDF z naszą <strong>Umową Współpracy</strong>. 
                    Dokument jest opatrzony Certyfikatem Akceptacji stanowiącym cyfrowy dowód zawarcia umowy (logi IP, znacznik czasu, hash wersji).</p>
                    <p>Niebawem wyślemy też osobną wiadomość z fakturą VAT.</p>
                    <p>Pozdrawiamy,<br/><strong>Zespół Nobelion</strong></p>
                </div>
            `,
            attachments: [
                {
                    filename: filename,
                    content: pdfBuffer
                }
            ]
        });
    } catch (e) {
        console.error('[Quotes] Błąd wysyłki maila z umową PDF:', e);
    }
}
