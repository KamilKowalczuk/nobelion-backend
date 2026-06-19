import puppeteer from 'puppeteer';
import MarkdownIt from 'markdown-it';
import fs from 'fs';
import path from 'path';

const md = new MarkdownIt({ html: true, breaks: true });

// Szablon CSS premium dla umów
const getPdfTemplate = (contentHtml: string, logoSrc: string) => `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <title>Umowa Współpracy</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=JetBrains+Mono:wght@400;600&family=Manrope:wght@400;500;600;700&display=swap');
        
        :root {
            --color-ink: #15171D;
            --color-ink-2: #34383F;
            --color-ink-3: #6A6E78;
            --color-paper: #FFFFFF; /* Czysta biel tła całej strony */
            --color-paper-edge: #E7E0D2; /* Złagodzone ramki komponentów */
            --color-brass: #B8893E;
            --color-hair-ink: rgba(21,23,29,0.10);
            --font-heading: 'Cinzel', serif;
            --font-sans: 'Manrope', sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
            --r-control: 9px;
            --r-card: 14px;
            --tracking-cinematic: 0.14em;
            --tracking-mono-cap: 0.24em;
        }

        body {
            font-family: var(--font-sans);
            font-size: 10pt;
            line-height: 1.6;
            color: var(--color-ink-2);
            background: var(--color-paper);
            margin: 0;
            padding: 25px 40px; 
        }

        /* Branding i nagłówek */
        .header {
            text-align: center;
            margin-bottom: 20px; 
            padding-bottom: 10px; 
        }
        
        .logo-img {
            max-width: 140px;
            height: auto;
            margin-bottom: 6px; 
            display: block;
            margin-left: auto;
            margin-right: auto;
        }

        .header-title {
            font-family: var(--font-heading);
            font-size: 14pt;
            letter-spacing: var(--tracking-cinematic);
            color: var(--color-ink);
            margin: 0;
            text-transform: uppercase;
        }

        /* Typografia Markdown */
        hr {
            display: none;
        }

        h1 {
            font-family: var(--font-heading);
            font-size: 15pt;
            color: var(--color-ink);
            text-align: center;
            margin-top: 0;
            margin-bottom: 25px; 
            text-transform: uppercase;
            letter-spacing: var(--tracking-cinematic);
            page-break-after: avoid;
            break-after: avoid;
        }

        h2, h3, h4 {
            font-family: var(--font-heading);
            font-size: 11pt;
            color: var(--color-ink);
            margin: 20px 0 10px; 
            border-bottom: 1px solid var(--color-paper-edge);
            padding-bottom: 6px;
            page-break-after: avoid;
            break-after: avoid;
            text-transform: uppercase;
            letter-spacing: var(--tracking-cinematic);
        }

        p {
            margin: 0 0 10px;
            text-align: justify;
            orphans: 4;
            widows: 4;
            color: var(--color-ink-2);
        }

        strong {
            color: var(--color-ink);
            font-weight: 700;
        }

        /* Tabele (Level 5) - zintegrowane z Kartami */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 20px 0;
            page-break-inside: avoid;
            break-inside: avoid;
            background-color: transparent;
        }
        
        tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        
        thead {
            display: table-header-group;
        }

        th {
            color: var(--color-ink-3);
            font-family: var(--font-mono);
            font-size: 8pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: var(--tracking-mono-cap);
            padding: 14px 18px;
            border-bottom: 1px solid var(--color-paper-edge);
            text-align: left;
        }

        th:first-child { padding-left: 0; }
        th:last-child { padding-right: 0; }

        td {
            padding: 14px 18px;
            border-bottom: 1px solid var(--color-hair-ink);
            vertical-align: top;
            color: var(--color-ink-2);
            font-size: 9.5pt;
        }

        td:first-child { padding-left: 0; }
        td:last-child { padding-right: 0; }

        tr:last-child td {
            border-bottom: none;
            padding-bottom: 0;
        }

        /* Zmienne z Payload (oznaczone w backtickach w Markdown) */
        code {
            font-family: inherit;
            font-weight: normal;
            color: var(--color-ink);
            background: none;
            padding: 0;
        }

        .certificate-section h1 {
            margin-top: 0;
        }

        blockquote {
            border-left: 2px solid var(--color-brass);
            margin: 15px 0;
            padding-left: 15px;
            color: var(--color-ink-3);
            font-style: italic;
        }

        ul, ol {
            margin: 0 0 15px 0;
            padding-left: 20px;
        }

        li {
            margin-bottom: 5px;
            text-align: justify;
        }

        /* System Kart */
        .parties-grid {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin: 15px 0 25px 0;
        }

        .party-card {
            background: var(--color-paper);
            border: 1px solid var(--color-paper-edge);
            border-radius: var(--r-card);
            padding: 24px 32px;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .party-title {
            display: block;
            font-family: var(--font-mono);
            font-size: 8pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: var(--tracking-mono-cap);
            color: var(--color-brass);
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--color-paper-edge);
        }

        .info-row {
            display: grid;
            grid-template-columns: 160px 1fr;
            gap: 12px;
            padding: 8px 0;
            border-bottom: 1px solid var(--color-hair-ink);
            align-items: baseline;
        }

        .info-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .info-label {
            font-family: var(--font-mono);
            font-size: 8pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: var(--tracking-mono-cap);
            color: var(--color-ink-3);
            line-height: 1.8;
        }

        .info-value {
            font-size: 9.5pt;
            line-height: 1.5;
            color: var(--color-ink-2);
        }

        .card-footer-text {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--color-paper-edge);
        }

        .card-footer-text p, .card-footer-text blockquote {
            margin: 0;
            font-size: 9.5pt;
            color: var(--color-ink-2);
        }
        
        /* Stopka stronicowania ukryta w ciele, używamy domyślnej z Puppeteera */
    </style>
</head>
<body>
    <div class="header">
        ${logoSrc ? `<img src="${logoSrc}" class="logo-img" alt="Logo" /><div class="header-title">NOBELION</div>` : `<div class="header-title">NOBELION</div>`}
    </div>
    
    <div class="content">
        ${contentHtml}
    </div>
</body>
</html>
`;

export async function generateContractPdf(markdownContent: string, dataParams: Record<string, string | number>): Promise<Buffer> {
    // 0. Czyszczenie Markdown ze znaczników sekcji np. "--- Część 3 ---"
    let cleanedMarkdown = markdownContent.replace(/^.*Część\s*\d+.*$/gim, '');
    
    // Obsługa warunkowego bloku [IF_MAINTENANCE] ... [/IF_MAINTENANCE]
    if (String(dataParams.HAS_SUBSCRIPTION) === 'false') {
        // Usuń cały blok wraz z zawartością, jeśli klient nie wybrał utrzymania
        cleanedMarkdown = cleanedMarkdown.replace(/\[IF_MAINTENANCE\][\s\S]*?\[\/IF_MAINTENANCE\]/gi, '');
    } else {
        // Usuń same znaczniki, zostawiając zawartość
        cleanedMarkdown = cleanedMarkdown.replace(/\[\/?IF_MAINTENANCE\]/gi, '');
    }

    // 1. Zamiana tagów na wartości z obiektu dataParams
    let personalizedMarkdown = cleanedMarkdown;
    for (const [key, value] of Object.entries(dataParams)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        personalizedMarkdown = personalizedMarkdown.replace(regex, String(value || '---'));
    }

    // 2. Wczytywanie logo i renderowanie do HTML
    let logoSrc = 'https://nobelion.pl/email-logo.png'; // Niezawodny fallback URL
    try {
        const localPath1 = path.join(process.cwd(), 'public', 'logo.png');
        const localPath2 = typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../public/logo.png') : null;
        const localPath3 = typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../public/logo.png') : null;
        const finalPath = fs.existsSync(localPath1) ? localPath1 : (localPath2 && fs.existsSync(localPath2) ? localPath2 : (localPath3 && fs.existsSync(localPath3) ? localPath3 : null));
        
        if (finalPath) {
            const base64 = fs.readFileSync(finalPath, 'base64');
            logoSrc = `data:image/png;base64,${base64}`;
        }
    } catch(e) {
        console.error('Błąd ładowania logo w PDF:', e);
    }

    let htmlContent = md.render(personalizedMarkdown);

    // Przetwarzanie zawartości na ustrukturyzowane siatki (Level 5 Cards)
    const convertToGridRows = (htmlBlock: string, isClient: boolean = false) => {
        const cleanBlock = htmlBlock.replace(/<\/?p>/gi, '').trim();
        const lines = cleanBlock.split(/<br\s*\/?>/i).map(l => l.trim()).filter(Boolean);
        let rowsHtml = '';
        
        if (isClient) {
            // Weryfikacja czy klient to firma (np. posiada NIP)
            const isCompany = lines.some(l => l.includes('NIP') || l.includes('KRS') || l.includes('REGON'));
            
            lines.forEach((line, index) => {
                let label = 'Info';
                let value = line;
                
                if (line.includes('NIP') || line.includes('KRS') || line.includes('REGON')) {
                    label = 'Rejestr';
                } else if (line.toLowerCase().includes('konsument') || line.includes('PESEL')) {
                    label = 'Identyfikator';
                } else if (line.toLowerCase().includes('reprez')) {
                    label = 'Reprezentacja';
                    value = value.replace(/^reprezentowan[aye] przez:?\s*/i, '').trim();
                } else if (index === 0) {
                    label = isCompany ? 'Firma' : 'Imię i nazwisko';
                } else if (index === 1) {
                    label = 'Adres';
                } else {
                    label = 'Dane';
                }

                rowsHtml += `<div class="info-row"><div class="info-label">${label}</div><div class="info-value">${value}</div></div>`;
            });
        } else {
            // WYKONAWCA (statyczny z markdowna <strong>Label:</strong>)
            for (const line of lines) {
                const match = line.match(/<strong>([^<]+)<\/strong>:?\s*(.*)/i);
                if (match) {
                    const label = match[1].replace(':', '').trim();
                    const value = match[2].trim();
                    rowsHtml += `<div class="info-row"><div class="info-label">${label}</div><div class="info-value">${value}</div></div>`;
                } else {
                    rowsHtml += `<div class="info-row"><div class="info-label">Info</div><div class="info-value">${line.trim()}</div></div>`;
                }
            }
        }
        return rowsHtml;
    };

    htmlContent = htmlContent.replace(
        /<p>\s*<strong>WYKONAWCA:<\/strong>\s*<br>\s*([\s\S]*?)<\/p>\s*<p>\s*<strong>ZAMAWIAJĄCY:<\/strong>\s*<br>\s*([\s\S]*?)<\/p>/gi,
        (match, p1, p2) => {
            return `<div class="parties-grid">
                <div class="party-card">
                    <span class="party-title">WYKONAWCA</span>
                    ${convertToGridRows(p1, false)}
                </div>
                <div class="party-card">
                    <span class="party-title">ZAMAWIAJĄCY</span>
                    ${convertToGridRows(p2, true)}
                </div>
            </div>`;
        }
    );
    // Drugi wariant jeśli parser nie da <br> bezpośrednio po nagłówku, ale w tej samej linijce itp.
    htmlContent = htmlContent.replace(
        /<p>\s*<strong>WYKONAWCA:<\/strong>\s*([\s\S]*?)<\/p>\s*<p>\s*<strong>ZAMAWIAJĄCY:<\/strong>\s*([\s\S]*?)<\/p>/gi,
        (match, p1, p2) => {
            return `<div class="parties-grid">
                <div class="party-card">
                    <span class="party-title">WYKONAWCA</span>
                    ${convertToGridRows(p1, false)}
                </div>
                <div class="party-card">
                    <span class="party-title">ZAMAWIAJĄCY</span>
                    ${convertToGridRows(p2, true)}
                </div>
            </div>`;
        }
    );

    // Konwersja tabeli HTML na info-row (identyczne jak karty Wykonawca/Zamawiający)
    const convertTableToGrid = (tableHtml: string): string => {
        const rows = [...tableHtml.matchAll(/<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi)];
        let rowsHtml = '';
        rows.forEach(row => {
            const label = row[1].replace(/<\/?p>/gi, '').replace(/<\/?strong>/gi, '').trim();
            const value = row[2].replace(/<\/?p>/gi, '').trim();
            rowsHtml += `<div class="info-row"><div class="info-label">${label}</div><div class="info-value">${value}</div></div>`;
        });
        return rowsHtml;
    };

    // Zabezpieczenie: Nagłówek (ZAMÓWIENIE) + Tabela + Akapit (ewentualny)
    htmlContent = htmlContent.replace(
        /(<p>\s*<strong>ZAMÓWIENIE:<\/strong>\s*<\/p>)\s*(<table[^>]*>[\s\S]*?<\/table>)\s*(<blockquote[^>]*>[\s\S]*?<\/blockquote>|<p>[\s\S]*?<\/p>)?/gi,
        (match, title, tableHtml, extraHtml) => {
            return `
            <div class="parties-grid">
                <div class="party-card" style="margin-top: 10px;">
                    <span class="party-title">ZAMÓWIENIE</span>
                    ${convertTableToGrid(tableHtml)}
                    ${extraHtml ? `<div class="card-footer-text">${extraHtml}</div>` : ''}
                </div>
            </div>`;
        }
    );

    // Tabela Certyfikatu (Część III) — identyczna karta jak ZAMÓWIENIE
    htmlContent = htmlContent.replace(
        /(<table[^>]*>[\s\S]*?<\/table>)\s*(<p>\s*<em>Pełen log akceptacji[\s\S]*?<\/p>)/gi,
        (match, tableHtml, footerHtml) => {
            return `
            <div class="parties-grid">
                <div class="party-card">
                    <span class="party-title">SZCZEGÓŁY AKCEPTACJI</span>
                    ${convertTableToGrid(tableHtml)}
                    <div class="card-footer-text">${footerHtml}</div>
                </div>
            </div>`;
        }
    );

    // Fallback dla samej tabeli + akapit bez nagłówka (gdyby coś było inaczej, zwykłe zabezpieczenie łamania stron)
    htmlContent = htmlContent.replace(/(?<!<div[^>]*>)(<table[^>]*>[\s\S]*?<\/table>)\s*(<p>[\s\S]*?<\/p>)/gi, '<div style="page-break-inside: avoid; break-inside: avoid;">\n$1\n$2\n</div>');

    // Wymuszone łamanie stron
    htmlContent = htmlContent.replace(/<hr\s*\/?>/gi, '');
    // "CZĘŚĆ II" upewniamy się, że nie chwyci "CZĘŚĆ III" poprzez (?!I) w regex.
    htmlContent = htmlContent.replace(/(<(h[1-6]|p)[^>]*>(?:<[^>]+>|\s)*CZĘŚĆ II(?!I).*?<\/\2>)/gi, '<div style="page-break-before: always;"></div>\n$1');
    htmlContent = htmlContent.replace(/(<(h[1-6]|p)[^>]*>(?:<[^>]+>|\s)*§\s*4\..*?<\/\2>)/gi, '<div style="page-break-before: always;"></div>\n$1');
    htmlContent = htmlContent.replace(/(<(h[1-6]|p)[^>]*>(?:<[^>]+>|\s)*§\s*6\..*?<\/\2>)/gi, '<div style="page-break-before: always;"></div>\n$1');
    htmlContent = htmlContent.replace(/(<(h[1-6]|p)[^>]*>(?:<[^>]+>|\s)*§\s*7\..*?<\/\2>)/gi, '<div style="page-break-before: always;"></div>\n$1');
    htmlContent = htmlContent.replace(/(<(h[1-6]|p)[^>]*>(?:<[^>]+>|\s)*§\s*10\..*?<\/\2>)/gi, '<div style="page-break-before: always;"></div>\n$1');
    htmlContent = htmlContent.replace(/(<(h[1-6]|p)[^>]*>(?:<[^>]+>|\s)*CZĘŚĆ III.*?<\/\2>)/gi, '<div style="page-break-before: always;"></div>\n$1');

    const fullHtml = getPdfTemplate(htmlContent, logoSrc);

    // 3. Konfiguracja Puppeteer (w Dockerze Alpine potrzebuje executablePath, lokalnie zadziała bez)
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--font-render-hinting=none' // lepsza jakość fontów w pdf
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined // Dla Alpine Docker
    });

    try {
        const page = await browser.newPage();
        await page.setContent(fullHtml, { waitUntil: 'load' });
        await page.evaluateHandle('document.fonts.ready'); // wymusza poprawne doczytanie webfontów (Cinzel, Manrope) przed drukiem
        // Wymusza poczekanie na załadowanie logo z sieci (email-logo.png fallback)
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});

        // 4. Generowanie PDF z elegancką stopką stronicowania
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                bottom: '60px',
                left: '20px',
                right: '20px'
            },
            displayHeaderFooter: true,
            headerTemplate: '<div></div>', // pusty
            footerTemplate: `
                <div style="width:100%; font-size:8px; font-family:'Manrope', sans-serif; color:#777; padding:0 40px; display:flex; justify-content:space-between;">
                    <span>Wygenerowano bezpiecznie przez Nobelion System</span>
                    <span>Strona <span class="pageNumber"></span> z <span class="totalPages"></span></span>
                </div>
            `
        });

        return Buffer.from(pdfBuffer);
    } finally {
        await browser.close();
    }
}
