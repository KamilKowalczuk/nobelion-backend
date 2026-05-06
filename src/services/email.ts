import { Resend } from 'resend';

export const sendQuoteEmail = async ({ 
    to, 
    companyName, 
    quoteAmount, 
    briefId 
}: { 
    to: string, 
    companyName: string, 
    quoteAmount: number, 
    briefId: string 
}) => {
    if (!process.env.RESEND_API_KEY) {
        console.warn('Brak klucza RESEND_API_KEY. Pominięto wysyłkę emaila.');
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    // TODO: Zmienić domenę na produkcyjną po wdrożeniu
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:4321' : 'https://nobelion.pl';
    const wycenaUrl = `${baseUrl}/wycena/${briefId}`;

    try {
        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'kontakt@nobelion.pl',
            to,
            subject: `Wycena projektu dla ${companyName} - Nobelion`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #050505;">Witaj,</h2>
                    <p>Zgodnie z naszymi ustaleniami przygotowaliśmy wycenę systemu dla Twojej firmy <strong>${companyName}</strong>.</p>
                    <p>Całkowita wartość inwestycji wynosi: <strong>${new Intl.NumberFormat('pl-PL').format(quoteAmount)} PLN netto</strong>.</p>
                    <p>Kliknij w poniższy link, aby zapoznać się ze szczegółami i przejść do bezpiecznej płatności (przez Stripe). Możesz opłacić całość lub pierwszą transzę (50%):</p>
                    <div style="margin: 30px 0;">
                        <a href="${wycenaUrl}" style="display: inline-block; padding: 14px 28px; background-color: #C5A059; color: #fff; text-decoration: none; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Przejdź do wyceny</a>
                    </div>
                    <p>W razie pytań, odpowiedz na tego maila.</p>
                    <p style="margin-top: 40px; font-size: 12px; color: #666;">
                        Pozdrawiamy,<br>
                        Zespół Nobelion<br>
                        <a href="https://nobelion.pl" style="color: #C5A059;">nobelion.pl</a>
                    </p>
                </div>
            `
        });
        console.log(`[Email] Wysłano wycenę do ${to}`);
    } catch (error) {
        console.error('[Email] Błąd wysyłania wyceny:', error);
    }
};
