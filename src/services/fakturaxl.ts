export class FakturaXlError extends Error {
    constructor(message: string, public code?: string | null, public rawResponse?: string) {
        super(message);
        this.name = 'FakturaXlError';
    }
}

export const issueInvoice = async ({
    email,
    companyName,
    buyerName,
    nip,
    street,
    postCode,
    city,
    phone,
    amountGross,
    description
}: {
    email: string;
    companyName?: string;
    buyerName?: string;
    nip?: string;
    street?: string;
    postCode?: string;
    city?: string;
    phone?: string;
    amountGross: number;
    description: string;
}) => {
    const token = (process.env.FAKTURAXL_API_TOKEN || '').trim();
    if (!token) {
        throw new FakturaXlError('Brak tokenu FAKTURAXL_API_TOKEN. Pominięto wystawienie faktury.');
    }

    const today = new Date().toISOString().split('T')[0];
    const isCompany = !!(companyName && companyName.trim());

    const vatRate = process.env.FAKTURAXL_VAT_RATE || 'zw';
    const isVatExempt = vatRate === 'zw';
    const exemptionBasis = process.env.FAKTURAXL_VAT_EXEMPTION_BASIS
        || 'Zwolnienie podmiotowe z VAT na podstawie art. 113 ust. 1 ustawy o VAT.';

    const paymentMethod = process.env.FAKTURAXL_PAYMENT_METHOD || 'Płatność elektroniczna';
    const cdata = (v?: string) => `<![CDATA[${(v || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

    const [firstName, ...rest] = (buyerName || '').trim().split(/\s+/);
    const lastName = rest.join(' ');

    const uwagiXml = isVatExempt ? `  <uwagi>${cdata(exemptionBasis)}</uwagi>\n` : '';

    const nabywcaXml = isCompany
        ? `    <firma_lub_osoba_prywatna>0</firma_lub_osoba_prywatna>
    <nazwa>${cdata(companyName)}</nazwa>
    <nip>${(nip || '').replace(/[^0-9A-Za-z]/g, '')}</nip>`
        : `    <firma_lub_osoba_prywatna>1</firma_lub_osoba_prywatna>
    <nazwa>${cdata(buyerName || 'Klient detaliczny')}</nazwa>
    <imie>${cdata(firstName || 'Klient')}</imie>
    <nazwisko>${cdata(lastName || 'detaliczny')}</nazwisko>`;

    const xmlData = `
<dokument>
  <api_token>${token}</api_token>
  <typ_faktury>0</typ_faktury>
  <data_wystawienia>${today}</data_wystawienia>
  <data_sprzedazy>${today}</data_sprzedazy>
  <termin_platnosci_data>${today}</termin_platnosci_data>
  <kwota_oplacona>${amountGross.toFixed(2)}</kwota_oplacona>
  <waluta>PLN</waluta>
  <rodzaj_platnosci>${paymentMethod}</rodzaj_platnosci>
  <wyslij_dokument_do_klienta_emailem>0</wyslij_dokument_do_klienta_emailem>
  <obliczaj_wartosc_faktury_od>1</obliczaj_wartosc_faktury_od>
${uwagiXml}  <nabywca>
${nabywcaXml}
    <ulica_i_numer>${cdata(street)}</ulica_i_numer>
    <kod_pocztowy>${cdata(postCode)}</kod_pocztowy>
    <miejscowosc>${cdata(city)}</miejscowosc>
    <kraj>PL</kraj>
    <email>${cdata(email)}</email>
    <telefon>${cdata(phone)}</telefon>
  </nabywca>
  <faktura_pozycje>
    <nazwa>${cdata(description)}</nazwa>
    <ilosc>1.000</ilosc>
    <jm>usł.</jm>
    <vat>${vatRate}</vat>
    <wartosc_brutto>${amountGross.toFixed(2)}</wartosc_brutto>
  </faktura_pozycje>
</dokument>
    `.trim();

    let responseText: string;
    try {
        const response = await fetch('https://program.fakturaxl.pl/api/dokument_dodaj.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml',
            },
            body: xmlData
        });
        responseText = await response.text();
    } catch (err: any) {
        throw new FakturaXlError(`Błąd sieciowy podczas wystawiania faktury: ${err.message}`);
    }

    const kodMatch = responseText.match(/<kod>(.*?)<\/kod>/);
    const kod = kodMatch ? kodMatch[1] : null;

    if (kod === '1') {
        const idMatch = responseText.match(/<dokument_id>(.*?)<\/dokument_id>/);
        const nrMatch = responseText.match(/<dokument_nr>(.*?)<\/dokument_nr>/);

        return {
            success: true,
            invoiceId: idMatch ? idMatch[1] : null,
            invoiceNumber: nrMatch ? nrMatch[1] : null,
            rawResponse: responseText
        };
    } else {
        const ERRORS: Record<string, string> = {
            '2': 'Przekroczono limit zapytań — spróbuj później',
            '3': 'Nieprawidłowy api_token (sprawdź FAKTURAXL_API_TOKEN — bez spacji/nowej linii, z właściwego konta)',
            '8': 'Nie istnieje taki id_dzialy_firmy',
            '9': 'Nazwa nabywcy nie może być pusta',
            '10': 'Nieprawidłowy NIP',
            '11': 'Błędny kraj',
            '13': 'Data musi mieć format yyyy-mm-dd',
            '18': 'Błędny rodzaj_platnosci (ustaw dozwoloną wartość, np. „Płatność elektroniczna")',
            '19': 'Limit darmowych faktur osiągnięty — wymagany Pakiet Pełny',
            '38': 'Imię nabywcy nie może być puste (osoba prywatna)',
            '39': 'Nazwisko nabywcy nie może być puste (osoba prywatna)',
            '70': 'Klucz API został zablokowany — kontakt z FakturaXL',
        };
        const hint = kod && ERRORS[kod] ? ` → ${ERRORS[kod]}` : '';
        throw new FakturaXlError(`Błąd wystawiania faktury (kod ${kod})${hint}`, kod, responseText);
    }
};

export const downloadInvoicePdf = async (invoiceId: string): Promise<Buffer> => {
    const token = process.env.FAKTURAXL_API_TOKEN;
    if (!token) throw new FakturaXlError('Brak tokenu FAKTURAXL_API_TOKEN. Pominięto pobieranie PDF.');

    const xmlData = `
<dokument>
  <api_token>${token}</api_token>
  <dokument_id>${invoiceId}</dokument_id>
</dokument>
    `.trim();

    let responseText: string;
    try {
        const response = await fetch('https://program.fakturaxl.pl/api/pdf_p.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/xml' },
            body: xmlData
        });
        responseText = await response.text();
    } catch (err: any) {
        throw new FakturaXlError(`Błąd sieciowy podczas pobierania PDF faktury: ${err.message}`);
    }

    const pdfMatch = responseText.match(/<pdf>([\s\S]*?)<\/pdf>/);
    if (!pdfMatch || !pdfMatch[1]) {
        throw new FakturaXlError('Brak PDF w odpowiedzi pdf_p.php', null, responseText);
    }
    return Buffer.from(pdfMatch[1].trim(), 'base64');
};
