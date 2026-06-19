import fs from 'fs';
import path from 'path';
import { generateContractPdf } from '../src/services/pdfGenerator.js';

async function main() {
    console.log('Rozpoczynam renderowanie PDF...');
    try {
        // Czytanie surowej umowy wprost z pliku referencyjnego
        const contractFilePath = path.join(process.cwd(), '../context/umowy/Umowa_Wspolpracy_testy.md');
        if (!fs.existsSync(contractFilePath)) {
            console.error(`❌ Nie znaleziono pliku umowy w: ${contractFilePath}`);
            process.exit(1);
        }
        
        const markdownContent = fs.readFileSync(contractFilePath, 'utf-8');
        console.log('✅ Pobrano prawdziwą strukturę umowy. Wypełnianie danych...');

        // Mockowe dane klienta
        const sampleData = {
            CLIENT_NAME: 'Przedsiębiorstwo Innowacyjne "Tech-Global" Sp. z o.o.',
            CLIENT_ADDRESS: 'ul. Programistów 128, 00-001 Warszawa',
            CLIENT_TAX_ID_LINE: 'NIP: 1234567890',
            CLIENT_REPRESENTATIVE_LINE: 'reprezentowana przez: Jana Kowalskiego',
            QUOTE_ID: '65f0a...123',
            ORDER_ID: 'ORD-2026-0001',
            SCOPE_SUMMARY: 'Realizacja usług programistycznych i wdrożeniowych zgodnie z zaakceptowanym zakresem prac',
            TOTAL_PRICE: 12500,
            PAYMENT_MODEL_LABEL: 'Płatność jednorazowa z rabatem 10%',
            PAYMENT_SCHEDULE_DETAILS: 'Opłacono w całości kwotę 11250 PLN netto.',
            SUBSCRIPTION_STATUS: 'TAK — 1500 PLN netto / mc, rozpoczęcie po końcowym odbiorze',
            HAS_SUBSCRIPTION: 'true',
            SIGNER_NAME: 'Jan Kowalski',
            SIGNER_EMAIL: 'jan.kowalski@tech-global.pl',
            SIGNER_ROLE: 'Reprezentant firmy',
            ACCEPTANCE_TIMESTAMP: new Date().toLocaleString('pl-PL'),
            IP_ADDRESS: '192.168.1.100',
            CONTRACT_VERSION: '1',
            STRIPE_SESSION_ID: 'Zaksięgowano z użyciem Stripe (cs_test_...)'
        };

        const pdfBuffer = await generateContractPdf(markdownContent, sampleData);
        const outputPath = path.join(process.cwd(), 'test-wycena-podglad.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);
        
        console.log(`✅ Sukces! Plik PDF zapisany jako: ${outputPath}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Błąd podczas generowania PDF:', error);
        process.exit(1);
    }
}

main();
