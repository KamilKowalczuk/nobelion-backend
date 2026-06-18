import { Resend } from 'resend';

type EmailSection = {
    label: string;
    value: string;
};

type BrandedEmailData = {
    preheader: string;
    eyebrow: string;
    title: string;
    intro: string;
    sections?: EmailSection[];
    cta?: {
        label: string;
        url: string;
    };
    // Dyskretny link tekstowy pod CTA (np. anulowanie subskrypcji).
    secondaryLink?: {
        label: string;
        url: string;
    };
    note?: string;
};

function getResend(): Resend {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('Brak klucza RESEND_API_KEY. Nie można wysłać emaila.');
    }
    return new Resend(process.env.RESEND_API_KEY);
}

function getFrom(): string {
    return process.env.EMAIL_FROM || 'kontakt@nobelion.pl';
}

function getInternal(): string {
    return process.env.EMAIL_INTERNAL || process.env.EMAIL_TO || 'kontakt@nobelion.pl';
}

function getFrontendUrl(): string {
    return (process.env.FRONTEND_URL || process.env.PUBLIC_SITE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4321' : 'https://nobelion.pl')).replace(/\/$/, '');
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

function renderBrandedEmail({ preheader, eyebrow, title, intro, sections = [], cta, secondaryLink, note }: BrandedEmailData): string {
    const sectionHtml = sections.map(section => `
        <tr>
            <td style="padding:18px 0;border-top:1px solid rgba(232,230,223,0.12);">
                <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#C5A059;margin-bottom:8px;">${escapeHtml(section.label)}</div>
                <div style="font-size:16px;line-height:1.65;color:#F7F4ED;">${escapeHtml(section.value).replace(/\n/g, '<br>')}</div>
            </td>
        </tr>
    `).join('');

    const ctaHtml = cta ? `
        <tr>
            <td align="center" style="padding:34px 0 10px;">
                <a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#C5A059;color:#080B10;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;padding:17px 28px;border-radius:999px;box-shadow:0 18px 42px rgba(197,160,89,0.22);">${escapeHtml(cta.label)}</a>
            </td>
        </tr>
        <tr>
            <td style="padding:12px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#9CA3AF;">
                Jeśli przycisk nie działa, skopiuj adres:<br><span style="color:#C5A059;word-break:break-all;">${escapeHtml(cta.url)}</span>
            </td>
        </tr>
    ` : '';

    const secondaryLinkHtml = secondaryLink ? `
        <tr>
            <td style="padding:18px 0 0;text-align:center;font-size:13px;line-height:1.6;color:#9CA3AF;">
                ${escapeHtml(secondaryLink.label)}<br>
                <a href="${escapeHtml(secondaryLink.url)}" style="color:#C5A059;text-decoration:underline;word-break:break-all;">${escapeHtml(secondaryLink.url)}</a>
            </td>
        </tr>
    ` : '';

    const noteHtml = note ? `
        <tr>
            <td style="padding:22px 0 0;font-size:14px;line-height:1.7;color:#B8B6AE;">${escapeHtml(note).replace(/\n/g, '<br>')}</td>
        </tr>
    ` : '';

    return `<!doctype html>
<html lang="pl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Nobelion</title>
</head>
<body style="margin:0;padding:0;background:#080B10;color:#F7F4ED;font-family:Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080B10;background-image:linear-gradient(135deg,#080B10 0%,#101722 55%,#080B10 100%);padding:32px 14px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border:1px solid rgba(197,160,89,0.22);background:#101722;border-radius:28px;overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,0.42);">
                    <tr>
                        <td style="padding:34px 34px 20px;background:linear-gradient(135deg,rgba(197,160,89,0.16),rgba(255,255,255,0.02));border-bottom:1px solid rgba(232,230,223,0.08);">
                            <img src="${getFrontendUrl()}/email-logo.png" width="56" height="56" alt="" style="display:block;width:56px;height:56px;margin-bottom:16px;border:0;" />
                            <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:0.24em;color:#F7F4ED;text-transform:uppercase;">Nobelion</div>
                            <div style="margin-top:22px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#C5A059;">${escapeHtml(eyebrow)}</div>
                            <h1 style="margin:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.16;font-weight:400;color:#F7F4ED;">${escapeHtml(title)}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px 34px 36px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="font-size:17px;line-height:1.75;color:#D8D5CB;">${escapeHtml(intro).replace(/\n/g, '<br>')}</td>
                                </tr>
                                ${sectionHtml}
                                ${ctaHtml}
                                ${secondaryLinkHtml}
                                ${noteHtml}
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:22px 34px 30px;border-top:1px solid rgba(232,230,223,0.08);font-size:12px;line-height:1.7;color:#838A96;text-align:center;">
                            Nobelion Sp. z o.o. · Automatyzacje AI i systemy dla firm<br>
                            <a href="https://nobelion.pl" style="color:#C5A059;text-decoration:none;">nobelion.pl</a> · <a href="mailto:kontakt@nobelion.pl" style="color:#C5A059;text-decoration:none;">kontakt@nobelion.pl</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export const sendQuoteEmail = async ({
    to,
    companyName,
    quoteAmount,
    quoteToken,
}: {
    to: string,
    companyName: string,
    quoteAmount: number,
    quoteToken: string
}) => {
    const resend = getResend();
    const quoteUrl = `${getFrontendUrl()}/wycena/${quoteToken}`;

    const { data, error } = await resend.emails.send({
        from: `Nobelion <${getFrom()}>`,
        to,
        subject: `Wycena projektu dla ${companyName} — Nobelion`,
        html: renderBrandedEmail({
            preheader: `Przygotowaliśmy dedykowaną wycenę projektu dla ${companyName}.`,
            eyebrow: 'Propozycja wdrożenia',
            title: `Wycena dla ${companyName}`,
            intro: 'Przygotowaliśmy dedykowany plan inwestycji, zakres prac oraz dostępne modele płatności. Na stronie wyceny możesz zaakceptować propozycję, wybrać wariant płatności albo poprosić o poprawki.',
            sections: [
                { label: 'Cena bazowa netto', value: formatMoney(quoteAmount) },
                { label: 'Opcje na stronie', value: 'Płatność jednorazowa z rabatem 10% albo płatność etapowa 50% na start.' },
            ],
            cta: {
                label: 'Zobacz pełną wycenę',
                url: quoteUrl,
            },
            note: 'Link jest indywidualny dla tej wyceny. W razie pytań możesz odpowiedzieć bezpośrednio na tę wiadomość.',
        }),
    });

    if (error) {
        console.error('[Email] BŁĄD Resend przy wysyłaniu wyceny:', JSON.stringify(error));
        throw new Error(`Nie udało się wysłać emaila z wyceną: ${error.message || JSON.stringify(error)}`);
    }

    console.log(`[Email] Wysłano wycenę do ${to}, Resend id: ${data?.id}`);
};

export const sendInternalChangeRequestEmail = async ({
    company,
    message,
}: {
    company: string,
    message: string
}) => {
    const resend = getResend();

    const { data, error } = await resend.emails.send({
        from: `Nobelion <${getFrom()}>`,
        to: getInternal(),
        subject: `[Poprawki do wyceny] ${company}`,
        html: renderBrandedEmail({
            preheader: `Klient ${company} poprosił o zmianę w wycenie.`,
            eyebrow: 'Prośba o poprawki',
            title: company,
            intro: 'Klient wysłał prośbę o modyfikację zakresu lub warunków wyceny.',
            sections: [
                { label: 'Wiadomość klienta', value: message },
                { label: 'Następny krok', value: 'Zaloguj się do panelu Payload, zaktualizuj wycenę i wyślij klientowi poprawioną wersję.' },
            ],
        }),
    });

    if (error) {
        console.error('[Email] BŁĄD Resend (zmiana wyceny):', JSON.stringify(error));
    } else {
        console.log(`[Email] Powiadomienie o poprawkach wysłane, Resend id: ${data?.id}`);
    }
};

export const sendSubscriptionEmail = async ({
    to,
    companyName,
    monthlyAmount,
    description,
    subscribeUrl,
    portalUrl,
}: {
    to: string,
    companyName: string,
    monthlyAmount: number,
    description?: string | null,
    subscribeUrl: string,
    portalUrl: string,
}) => {
    const resend = getResend();

    const sections: EmailSection[] = [
        { label: 'Abonament miesięczny netto', value: formatMoney(monthlyAmount) },
    ];
    if (description) {
        sections.push({ label: 'Co obejmuje pakiet', value: description });
    }
    sections.push({
        label: 'Jak to działa',
        value: 'Po kliknięciu przycisku przejdziesz na bezpieczną stronę płatności Stripe. Uzupełniasz dane karty oraz dane do faktury — subskrypcja odnawia się automatycznie co miesiąc.',
    });

    const { data, error } = await resend.emails.send({
        from: `Nobelion <${getFrom()}>`,
        to,
        subject: `Pakiet utrzymania dla ${companyName} — Nobelion`,
        html: renderBrandedEmail({
            preheader: `Aktywuj pakiet utrzymania i opieki technicznej dla ${companyName}.`,
            eyebrow: 'Pakiet utrzymania',
            title: `Opieka techniczna dla ${companyName}`,
            intro: 'Przygotowaliśmy dla Ciebie pakiet utrzymania wdrożonego systemu. Płatność działa w modelu miesięcznej subskrypcji — bez zobowiązań długoterminowych, z możliwością rezygnacji w każdej chwili.',
            sections,
            cta: {
                label: 'Aktywuj subskrypcję',
                url: subscribeUrl,
            },
            secondaryLink: {
                label: 'Subskrypcję możesz w każdej chwili anulować samodzielnie pod adresem:',
                url: portalUrl,
            },
            note: 'Link jest indywidualny dla Twojej firmy. W razie pytań odpowiedz bezpośrednio na tę wiadomość.',
        }),
    });

    if (error) {
        console.error('[Email] BŁĄD Resend (link subskrypcji):', JSON.stringify(error));
        throw new Error(`Nie udało się wysłać emaila z linkiem subskrypcji: ${error.message || JSON.stringify(error)}`);
    }

    console.log(`[Email] Wysłano link subskrypcji do ${to}, Resend id: ${data?.id}`);
};

export const sendFinalPaymentEmail = async ({
    to,
    companyName,
    amount,
    payUrl,
}: {
    to: string,
    companyName: string,
    amount: number,
    payUrl: string,
}) => {
    const resend = getResend();

    const { data, error } = await resend.emails.send({
        from: `Nobelion <${getFrom()}>`,
        to,
        subject: `Płatność końcowa (II rata) dla ${companyName} — Nobelion`,
        html: renderBrandedEmail({
            preheader: `Druga rata za wdrożenie dla ${companyName} jest gotowa do opłacenia.`,
            eyebrow: 'Płatność końcowa',
            title: `Druga rata dla ${companyName}`,
            intro: 'Prace nad Twoim projektem zostały zakończone — czas na płatność końcową. Pierwsza rata (50%) była opłacona na starcie; poniższy link finalizuje rozliczenie drugą, ostatnią ratą (pozostałe 50%).',
            sections: [
                { label: 'Kwota II raty (pozostałe 50%)', value: formatMoney(amount) },
                { label: 'Po płatności', value: 'Otrzymasz potwierdzenie oraz fakturę PDF. To zamyka rozliczenie i finalizuje przekazanie projektu.' },
            ],
            cta: {
                label: 'Opłać II ratę',
                url: payUrl,
            },
            note: 'Link jest indywidualny dla Twojego zamówienia. W razie pytań odpowiedz bezpośrednio na tę wiadomość.',
        }),
    });

    if (error) {
        console.error('[Email] BŁĄD Resend (link II raty):', JSON.stringify(error));
        throw new Error(`Nie udało się wysłać emaila z linkiem do II raty: ${error.message || JSON.stringify(error)}`);
    }

    console.log(`[Email] Wysłano link II raty do ${to}, Resend id: ${data?.id}`);
};

export const sendSubscriptionCanceledEmail = async ({
    company,
    customerEmail,
}: {
    company: string,
    customerEmail: string,
}) => {
    const resend = getResend();

    const { data, error } = await resend.emails.send({
        from: `Nobelion <${getFrom()}>`,
        to: getInternal(),
        subject: `[Subskrypcja anulowana] ${company}`,
        html: renderBrandedEmail({
            preheader: `Klient ${company} zakończył subskrypcję utrzymania.`,
            eyebrow: 'Subskrypcja anulowana',
            title: company,
            intro: 'Klient zrezygnował z pakietu utrzymania. Subskrypcja w Stripe została zakończona, status wyceny w panelu zaktualizowany.',
            sections: [
                { label: 'Firma', value: company },
                { label: 'Email klienta', value: customerEmail },
                { label: 'Następny krok', value: 'Rozważ kontakt z klientem — warto poznać powód rezygnacji.' },
            ],
        }),
    });

    if (error) {
        console.error('[Email] BŁĄD Resend (anulowanie subskrypcji — wewn.):', JSON.stringify(error));
    } else {
        console.log(`[Email] Powiadomienie wewnętrzne o anulowaniu subskrypcji wysłane, Resend id: ${data?.id}`);
    }
};

// Wspólny builder maili subskrypcyjnych do klienta (z fakturą PDF + linkiem anulowania).
type SubscriptionMailInput = {
    to: string,
    amount: number,
    orderNumber: string,
    invoicePdf?: Buffer | null,
    invoiceNumber?: string | null,
    portalUrl?: string,
};

async function sendSubscriptionClientMail(
    input: SubscriptionMailInput,
    copy: { subject: string; eyebrow: string; title: string; lead: string; firstLabel: string },
    logTag: string,
) {
    const resend = getResend();
    const hasInvoice = !!input.invoicePdf;

    const sections: EmailSection[] = [
        { label: copy.firstLabel, value: formatMoney(input.amount) },
        { label: 'Numer zamówienia', value: input.orderNumber },
    ];
    if (hasInvoice && input.invoiceNumber) {
        sections.push({ label: 'Faktura', value: input.invoiceNumber });
    }

    const invoiceLine = hasInvoice
        ? ' Faktura w formacie PDF znajduje się w załączniku tej wiadomości.'
        : ' Faktura dotrze w osobnej wiadomości.';

    const { data, error } = await resend.emails.send({
        from: `Nobelion <${getFrom()}>`,
        to: input.to,
        subject: copy.subject,
        html: renderBrandedEmail({
            preheader: `${copy.title} — opieka techniczna Nobelion.`,
            eyebrow: copy.eyebrow,
            title: copy.title,
            intro: copy.lead + invoiceLine,
            sections,
            ...(input.portalUrl ? {
                secondaryLink: {
                    label: 'Subskrypcję możesz w każdej chwili anulować samodzielnie pod adresem:',
                    url: input.portalUrl,
                },
            } : {}),
            note: 'W razie pytań odpowiedz bezpośrednio na tę wiadomość — to skrzynka, którą czytamy.',
        }),
        ...(hasInvoice ? {
            attachments: [{
                filename: `faktura-${(input.invoiceNumber || input.orderNumber).replace(/[^\w.-]+/g, '_')}.pdf`,
                content: input.invoicePdf as Buffer,
            }]
        } : {}),
    });

    if (error) {
        console.error(`[Email] BŁĄD Resend (${logTag}):`, JSON.stringify(error));
    } else {
        console.log(`[Email] ${logTag}${hasInvoice ? ' z fakturą' : ''} wysłane do ${input.to}, Resend id: ${data?.id}`);
    }
}

// Pierwsza płatność — aktywacja pakietu wsparcia.
export const sendSubscriptionActivatedEmail = (input: SubscriptionMailInput) =>
    sendSubscriptionClientMail(input, {
        subject: 'Pakiet wsparcia aktywny — Nobelion',
        eyebrow: 'Wsparcie techniczne',
        title: 'Wsparcie aktywne',
        lead: 'Dziękujemy — Twój pakiet opieki technicznej jest aktywny i od teraz czuwamy nad działaniem systemu. Płatność odnawia się automatycznie co miesiąc; nie musisz o niczym pamiętać.',
        firstLabel: 'Abonament miesięczny',
    }, 'Potwierdzenie aktywacji subskrypcji');

// Kolejne miesiące — kontynuacja (inny ton niż aktywacja).
export const sendSubscriptionRenewedEmail = (input: SubscriptionMailInput) =>
    sendSubscriptionClientMail(input, {
        subject: 'Opieka techniczna — kolejny miesiąc opłacony',
        eyebrow: 'Wsparcie techniczne',
        title: 'Kolejny miesiąc opieki',
        lead: 'Dziękujemy — kolejna miesięczna rata za opiekę techniczną została pobrana, a Twój system pozostaje pod naszą opieką. Nic nie musisz robić; ta wiadomość to potwierdzenie i faktura za bieżący okres.',
        firstLabel: 'Pobrana rata miesięczna',
    }, 'Potwierdzenie kontynuacji subskrypcji');

// Zakończenie — mail do KLIENTA po anulowaniu (osobno od powiadomienia wewnętrznego).
export const sendSubscriptionEndedEmail = async ({
    to,
    companyName,
}: {
    to: string,
    companyName?: string,
}) => {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
        from: `Nobelion <${getFrom()}>`,
        to,
        subject: 'Subskrypcja wsparcia zakończona — Nobelion',
        html: renderBrandedEmail({
            preheader: 'Twoja subskrypcja opieki technicznej została zakończona.',
            eyebrow: 'Subskrypcja zakończona',
            title: 'Wsparcie wyłączone',
            intro: `Potwierdzamy zakończenie subskrypcji opieki technicznej${companyName ? ` dla ${companyName}` : ''}. Nie pobierzemy już żadnych kolejnych płatności — rozliczenie jest zamknięte. Dziękujemy za czas, przez który mogliśmy dbać o Twój system.`,
            sections: [
                { label: 'Status', value: 'Subskrypcja zakończona — brak dalszych obciążeń' },
                { label: 'Powrót', value: 'Gdybyś chciał wznowić opiekę w przyszłości — wystarczy, że napiszesz. Przygotujemy nowy pakiet.' },
            ],
            note: 'Masz pytania albo chcesz wrócić? Odpowiedz na tę wiadomość lub napisz na kontakt@nobelion.pl.',
        }),
    });

    if (error) {
        console.error('[Email] BŁĄD Resend (zakończenie subskrypcji — klient):', JSON.stringify(error));
    } else {
        console.log(`[Email] Mail o zakończeniu subskrypcji wysłany do klienta ${to}, Resend id: ${data?.id}`);
    }
};

// Rodzaj płatności decyduje o treści maila potwierdzającego.
type PaymentKind = '50' | 'final50' | '100';

export const sendPaymentConfirmation = async ({
    to,
    orderNumber,
    amount,
    invoicePdf,
    invoiceNumber,
    kind = '100',
    contractPdf,
    contractFilename,
}: {
    to: string,
    orderNumber: string,
    amount: number,
    invoicePdf?: Buffer | null,
    invoiceNumber?: string | null,
    kind?: PaymentKind,
    contractPdf?: Buffer | null,
    contractFilename?: string | null,
}) => {
    const resend = getResend();

    const hasInvoice = !!invoicePdf;
    const sections: EmailSection[] = [
        { label: 'Numer zamówienia', value: orderNumber },
        { label: 'Kwota', value: formatMoney(amount) },
    ];
    if (hasInvoice && invoiceNumber) {
        sections.push({ label: 'Faktura', value: invoiceNumber });
    }

    // Treść zależna od rodzaju płatności.
    const variants: Record<PaymentKind, { subject: string; eyebrow: string; title: string; lead: string }> = {
        '50': {
            subject: 'Pierwsza rata potwierdzona — zaczynamy pracę',
            eyebrow: 'Pierwsza rata potwierdzona',
            title: 'Zaczynamy pracę',
            lead: 'Dziękujemy — pierwsza rata (50%) została zaksięgowana i jest dla nas sygnałem startu. Pozostałe 50% opłacisz dopiero na zakończenie projektu, linkiem, który wyślemy Ci mailem, gdy prace będą gotowe.',
        },
        'final50': {
            subject: 'Płatność końcowa potwierdzona — projekt rozliczony',
            eyebrow: 'Płatność końcowa potwierdzona',
            title: 'Projekt rozliczony',
            lead: 'Dziękujemy — druga, końcowa rata została zaksięgowana, a zamówienie jest w pełni opłacone. To domyka rozliczenie projektu po obu stronach.',
        },
        '100': {
            subject: 'Płatność potwierdzona — zaczynamy',
            eyebrow: 'Płatność potwierdzona',
            title: 'Zaczynamy',
            lead: 'Dziękujemy za płatność. Zamówienie zostało potwierdzone i przechodzimy do realizacji ustalonego zakresu.',
        },
    };
    const v = variants[kind] || variants['100'];
    const invoiceLine = hasInvoice
        ? ' Faktura w formacie PDF znajduje się w załączniku tej wiadomości.'
        : ' Faktura zostanie wysłana w osobnej wiadomości.';

    const contractLine = contractPdf
        ? ' W załączniku znajdziesz również spersonalizowaną, wygenerowaną właśnie dla Ciebie Umowę Współpracy, podpisaną cyfrowo poprzez system logowania akceptacji.'
        : '';

    const attachments = [];
    if (hasInvoice && invoicePdf) {
        attachments.push({
            filename: `faktura-${(invoiceNumber || orderNumber).replace(/[^\w.-]+/g, '_')}.pdf`,
            content: invoicePdf as Buffer,
        });
    }
    if (contractPdf) {
        attachments.push({
            filename: contractFilename || 'Umowa_wspolpracy_Nobelion.pdf',
            content: contractPdf as Buffer,
        });
    }

    const { data, error } = await resend.emails.send({
        from: `Nobelion <${getFrom()}>`,
        to,
        subject: v.subject,
        html: renderBrandedEmail({
            preheader: `${v.title} — płatność potwierdzona.`,
            eyebrow: v.eyebrow,
            title: v.title,
            intro: v.lead + invoiceLine + contractLine,
            sections,
            note: 'W razie pytań odpowiedz bezpośrednio na tę wiadomość — to skrzynka, którą czytamy.',
        }),
        ...(attachments.length > 0 ? { attachments } : {}),
    });

    if (error) {
        console.error('[Email] BŁĄD Resend (potwierdzenie płatności):', JSON.stringify(error));
    } else {
        console.log(`[Email] Potwierdzenie płatności (${kind})${hasInvoice ? ' z fakturą' : ''} wysłane do ${to}, Resend id: ${data?.id}`);
    }
};
