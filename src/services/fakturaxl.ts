export const issueInvoice = async ({
    email,
    companyName,
    nip,
    amountGross,
    description
}: {
    email: string;
    companyName?: string;
    nip?: string;
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
    
    // Generowanie XML zgodnie z dokumentacją
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
  <wyslij_dokument_do_klienta_emailem>1</wyslij_dokument_do_klienta_emailem>
  <obliczaj_wartosc_faktury_od>1</obliczaj_wartosc_faktury_od>
  <nabywca>
    <firma_lub_osoba_prywatna>${isCompany ? '0' : '1'}</firma_lub_osoba_prywatna>
    <nazwa><![CDATA[${companyName || 'Klient detaliczny'}]]></nazwa>
    <nip>${nip || ''}</nip>
    <kraj>PL</kraj>
    <email>${email}</email>
  </nabywca>
  <faktura_pozycje>
    <nazwa><![CDATA[${description}]]></nazwa>
    <ilosc>1</ilosc>
    <jm>usł.</jm>
    <vat>23</vat>
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
