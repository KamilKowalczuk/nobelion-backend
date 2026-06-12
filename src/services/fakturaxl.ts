export const issueInvoice = async ({
    email,
    companyName,
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
    nip?: string;
    street?: string;
    postCode?: string;
    city?: string;
    phone?: string;
    amountGross: number;
    description: string;
}) => {
    const token = process.env.FAKTURAXL_API_TOKEN;
    if (!token) {
        console.warn('Brak tokenu FAKTURAXL_API_TOKEN. Pominięto wystawienie faktury.');
        return null;
    }

    const today = new Date().toISOString().split('T')[0];

    // Typ nabywcy: 0 - firma, 1 - osoba prywatna
    const isCompany = !!nip;

    // ── Zwolnienie z VAT ──
    // Firma korzysta ze zwolnienia podmiotowego — stawka 'zw', brak naliczonego VAT.
    // Konfigurowalne: FAKTURAXL_VAT_RATE (domyślnie 'zw'), podstawa prawna w uwagach.
    const vatRate = process.env.FAKTURAXL_VAT_RATE || 'zw';
    const isVatExempt = vatRate === 'zw';
    const exemptionBasis = process.env.FAKTURAXL_VAT_EXEMPTION_BASIS
        || 'Zwolnienie podmiotowe z VAT na podstawie art. 113 ust. 1 ustawy o VAT.';

    const escapeXml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const uwagiXml = isVatExempt ? `  <uwagi><![CDATA[${exemptionBasis}]]></uwagi>` : '';

    const xmlData = `
<dokument>
  <api_token>${token}</api_token>
  <typ_faktury>0</typ_faktury>
  <obliczaj_sume_wartosci_faktury_wg>1</obliczaj_sume_wartosci_faktury_wg>
  <data_wystawienia>${today}</data_wystawienia>
  <data_sprzedazy>${today}</data_sprzedazy>
  <termin_platnosci_data>${today}</termin_platnosci_data>
  <kwota_oplacona>${amountGross.toFixed(2)}</kwota_oplacona>
  <waluta>PLN</waluta>
  <rodzaj_platnosci>Stripe</rodzaj_platnosci>
  <wyslij_dokument_do_klienta_emailem>0</wyslij_dokument_do_klienta_emailem>
  <obliczaj_wartosc_faktury_od>1</obliczaj_wartosc_faktury_od>
${uwagiXml}
  <nabywca>
    <firma_lub_osoba_prywatna>${isCompany ? '0' : '1'}</firma_lub_osoba_prywatna>
    <nazwa><![CDATA[${companyName || 'Klient detaliczny'}]]></nazwa>
    <nip>${nip || ''}</nip>
    <adres><![CDATA[${street ? escapeXml(street) : ''}]]></adres>
    <kod_pocztowy>${postCode ? escapeXml(postCode) : ''}</kod_pocztowy>
    <miasto><![CDATA[${city ? escapeXml(city) : ''}]]></miasto>
    <kraj>PL</kraj>
    <email>${escapeXml(email)}</email>
    <telefon>${phone ? escapeXml(phone) : ''}</telefon>
  </nabywca>
  <faktura_pozycje>
    <nazwa><![CDATA[${escapeXml(description)}]]></nazwa>
    <ilosc>1</ilosc>
    <jm>usł.</jm>
    <vat>${vatRate}</vat>
    <wartosc_brutto>${amountGross.toFixed(2)}</wartosc_brutto>
  </faktura_pozycje>
</dokument>
    `.trim();

    try {
        const response = await fetch('https://program.fakturaxl.pl/api/dokument_dodaj.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml',
            },
            body: xmlData
        });

        const responseText = await response.text();

        // Zgrubne parsowanie XML za pomocą RegExp (unikanie ciężkich bibliotek do XML w prostym przypadku)
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
            console.error('[FakturaXL] Błąd wystawiania:', responseText);
            return {
                success: false,
                error: responseText
            };
        }

    } catch (err) {
        console.error('[FakturaXL] Wyjątek podczas wystawiania faktury:', err);
        return { success: false, error: String(err) };
    }
};

// Pobiera PDF faktury (endpoint pdf_p.php zwraca XML z base64 w <pdf>).
// Fakturę wysyłamy klientowi sami, brandowanym mailem z załącznikiem —
// dlatego wyslij_dokument_do_klienta_emailem=0 przy wystawianiu.
export const downloadInvoicePdf = async (invoiceId: string): Promise<Buffer | null> => {
    const token = process.env.FAKTURAXL_API_TOKEN;
    if (!token) return null;

    const xmlData = `
<dokument>
  <api_token>${token}</api_token>
  <dokument_id>${invoiceId}</dokument_id>
</dokument>
    `.trim();

    try {
        const response = await fetch('https://program.fakturaxl.pl/api/pdf_p.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/xml' },
            body: xmlData
        });
        const responseText = await response.text();
        const pdfMatch = responseText.match(/<pdf>([\s\S]*?)<\/pdf>/);
        if (!pdfMatch || !pdfMatch[1]) {
            console.error('[FakturaXL] Brak PDF w odpowiedzi pdf_p.php:', responseText.slice(0, 300));
            return null;
        }
        return Buffer.from(pdfMatch[1].trim(), 'base64');
    } catch (err) {
        console.error('[FakturaXL] Wyjątek podczas pobierania PDF:', err);
        return null;
    }
};
