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
                <div style="background-color: #050505; color: #FFFFFF; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px 20px; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border: 1px solid rgba(255,255,255,0.1); padding: 40px;">
                        <div style="text-align: center; margin-bottom: 40px;">
                            <h1 style="color: #C5A059; font-weight: 300; letter-spacing: 4px; margin: 0; text-transform: uppercase; font-size: 24px;">Nobelion</h1>
                        </div>
                        
                        <div style="display: inline-block; padding: 4px 12px; margin-bottom: 24px; border: 1px solid rgba(197, 160, 89, 0.3); color: #C5A059; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">
                            Propozycja Wdrożenia
                        </div>

                        <h2 style="font-size: 24px; font-weight: 300; margin-top: 0; margin-bottom: 24px; color: #FFFFFF;">
                            Wycena projektu dla <span style="color: #C5A059;">${companyName}</span>
                        </h2>
                        
                        <p style="color: #9CA3AF; font-size: 16px; margin-bottom: 24px;">Zgodnie z naszymi wcześniejszymi ustaleniami, przygotowaliśmy dla Ciebie dedykowany plan inwestycji oraz szczegóły technologiczne Twojego rozwiązania.</p>
                        
                        <div style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 24px; margin-bottom: 32px; text-align: center;">
                            <div style="font-size: 12px; color: #C5A059; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Cena bazowa projektu netto</div>
                            <div style="font-size: 28px; font-weight: 400; color: #FFFFFF;">${new Intl.NumberFormat('pl-PL').format(quoteAmount)} PLN</div>
                        </div>
                        
                        <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 32px;">Kliknij poniższy przycisk, aby zobaczyć pełny plan prac, zapoznać się ze specyfikacją technologiczną oraz poznać dostępne modele płatności (w tym opcję <strong>rabatu 10%</strong>).</p>
                        
                        <div style="text-align: center; margin-bottom: 40px;">
                            <a href="${wycenaUrl}" style="display: inline-block; padding: 16px 32px; background-color: #C5A059; color: #050505; text-decoration: none; font-weight: bold; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">
                                Zobacz pełną wycenę
                            </a>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 40px 0;">
                        
                        <div style="text-align: center; color: #6B7280; font-size: 12px;">
                            <p style="margin: 0 0 8px 0;">W razie pytań lub chęci modyfikacji wyceny, możesz użyć formularza na stronie z wyceną, lub po prostu odpowiedzieć na tę wiadomość.</p>
                            <p style="margin: 0;"><a href="https://nobelion.pl" style="color: #C5A059; text-decoration: none;">nobelion.pl</a> • Studio Tworzenia Oprogramowania</p>
                        </div>
                    </div>
                </div>
            `
        });
        console.log(`[Email] Wysłano wycenę do ${to}`);
    } catch (error) {
        console.error('[Email] Błąd wysyłania wyceny:', error);
    }
};

export const sendInternalChangeRequestEmail = async ({ 
    company, 
    message 
}: { 
    company: string, 
    message: string 
}) => {
    if (!process.env.RESEND_API_KEY) {
        console.warn('Brak klucza RESEND_API_KEY. Pominięto wysyłkę emaila o prośbie zmiany.');
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'kontakt@nobelion.pl',
            to: process.env.EMAIL_TO || 'kontakt@nobelion.pl', // Wewnętrzny adres powiadomień
            subject: `[Poprawki do wyceny] ${company}`,
            html: `
                <div style="background-color: #050505; color: #FFFFFF; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px 20px; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border: 1px solid rgba(255,255,255,0.1); padding: 40px;">
                        <h2 style="color: #FFFFFF; font-weight: 300; margin-top: 0;">Klient prosi o zmianę w wycenie</h2>
                        <p style="color: #9CA3AF;">Klient <strong style="color: #C5A059;">${company}</strong> wysłał prośbę o poprawki do swojej wyceny.</p>
                        <div style="background-color: rgba(255,255,255,0.02); padding: 20px; border-left: 4px solid #C5A059; margin: 30px 0; white-space: pre-wrap; color: #E5E7EB; font-size: 14px;">${message}</div>
                        <p style="color: #9CA3AF; font-size: 14px;">Zaloguj się do panelu Payload CMS, aby zmodyfikować brief, uzupełnić ceny i opisy, a następnie zaznaczyć "Wyślij e-mail z wyceną" aby wysłać klientowi poprawioną wersję.</p>
                    </div>
                </div>
            `
        });
        console.log(`[Email] Wysłano powiadomienie wewnętrzne o poprawkach od ${company}`);
    } catch (error) {
        console.error('[Email] Błąd wysyłania powiadomienia o poprawkach:', error);
    }
};
