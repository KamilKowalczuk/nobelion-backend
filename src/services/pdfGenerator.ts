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
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Cinzel:wght@600;700&display=swap');
        
        :root {
            --color-ink: #15171D;
            --color-ink-2: #34383F;
            --color-ink-3: #6A6E78;
            --color-paper: #FFFFFF; /* Czysta biel dla wydruku */
            --color-brass: #B8893E;
            --color-hair-ink: rgba(21,23,29,0.10);
            --font-heading: 'Cinzel', serif;
            --font-sans: 'Manrope', sans-serif;
            --r-control: 9px;
            --r-card: 14px;
            --r-shell: 18px;
        }

        body {
            font-family: var(--font-sans);
            font-size: 10pt;
            line-height: 1.6;
            color: var(--color-ink-2);
            background: var(--color-paper);
            margin: 0;
            padding: 40px;
        }

        /* Branding i nagłówek */
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--color-brass);
        }
        
        .logo-img {
            max-width: 200px;
            height: auto;
            margin-bottom: 20px;
        }

        /* Typografia Markdown */
        h1 {
            font-family: var(--font-heading);
            font-size: 16pt;
            color: var(--color-brass);
            text-align: center;
            margin: 40px 0 20px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        h2 {
            font-family: var(--font-heading);
            font-size: 13pt;
            color: var(--color-ink);
            margin: 30px 0 15px;
            border-bottom: 1px solid var(--color-hair-ink);
            padding-bottom: 5px;
        }

        p {
            margin: 0 0 10px;
            text-align: justify;
        }

        strong {
            color: var(--color-ink);
            font-weight: 700;
        }

        /* Tabele */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            page-break-inside: avoid;
            background-color: #FFFFFF;
            border-radius: var(--r-card);
            overflow: hidden;
            border: 1px solid var(--color-hair-ink);
        }

        th {
            background-color: var(--color-ink);
            color: #FFFFFF;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 12px 15px;
            border-bottom: 3px solid var(--color-brass);
            text-align: left;
        }

        td {
            padding: 12px 15px;
            border-bottom: 1px solid var(--color-hair-ink);
            vertical-align: top;
            color: var(--color-ink-2);
        }

        tr:last-child td {
            border-bottom: none;
        }

        /* Zmienne z Payload (oznaczone w backtickach w Markdown) */
        code {
            font-family: inherit;
            font-weight: 700;
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
        
        /* Stopka stronicowania ukryta w ciele, używamy domyślnej z Puppeteera */
    </style>
</head>
<body>
    <div class="header">
        ${logoSrc ? `<img src="${logoSrc}" class="logo-img" alt="Nobelion" />` : `<div style="font-size: 24pt; font-weight: bold;">NOBELION</div>`}
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
    let logoSrc = '';
    try {
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(logoPath)) {
            const base64 = fs.readFileSync(logoPath, 'base64');
            logoSrc = `data:image/png;base64,${base64}`;
        }
    } catch(e) {
        console.error('Błąd ładowania logo w PDF:', e);
    }

    const htmlContent = md.render(personalizedMarkdown);
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
