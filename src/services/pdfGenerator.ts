import puppeteer from 'puppeteer';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: true, breaks: true });

// Szablon CSS premium dla umów
const getPdfTemplate = (contentHtml: string) => `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <title>Umowa Współpracy</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Cinzel:wght@600;700&display=swap');
        
        :root {
            --color-ink: #080b10;
            --color-ink-2: #1e2330;
            --color-ink-3: #3b4255;
            --color-paper: #ffffff;
            --color-brass: #b8893e;
            --color-hair-ink: #eaeaea;
        }

        body {
            font-family: 'Manrope', sans-serif;
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
        
        .logo {
            font-family: 'Cinzel', serif;
            font-size: 24pt;
            font-weight: 700;
            color: var(--color-ink);
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        /* Typografia Markdown */
        h1 {
            font-family: 'Cinzel', serif;
            font-size: 16pt;
            color: var(--color-brass);
            text-align: center;
            margin: 40px 0 20px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        h2 {
            font-family: 'Cinzel', serif;
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
        }

        th {
            background-color: #f8f9fa;
            color: var(--color-ink);
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 10px;
            border-bottom: 2px solid var(--color-brass);
            text-align: left;
        }

        td {
            padding: 10px;
            border-bottom: 1px solid var(--color-hair-ink);
            vertical-align: top;
        }

        tr:last-child td {
            border-bottom: none;
        }

        /* Certyfikat Akceptacji */
        .certificate-section {
            margin-top: 40px;
            padding: 20px;
            border: 1px solid var(--color-brass);
            background-color: rgba(184, 137, 62, 0.02);
            page-break-inside: avoid;
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
        <div class="logo">NOBELION</div>
    </div>
    
    <div class="content">
        ${contentHtml}
    </div>
</body>
</html>
`;

export async function generateContractPdf(markdownContent: string, dataParams: Record<string, string | number>): Promise<Buffer> {
    // 1. Zamiana tagów na wartości z obiektu dataParams
    let personalizedMarkdown = markdownContent;
    for (const [key, value] of Object.entries(dataParams)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        personalizedMarkdown = personalizedMarkdown.replace(regex, String(value || '---'));
    }

    // 2. Renderowanie Markdown do HTML
    const htmlContent = md.render(personalizedMarkdown);
    const fullHtml = getPdfTemplate(htmlContent);

    // 3. Konfiguracja Puppeteer (w Dockerze Alpine potrzebuje executablePath, lokalnie zadziała bez)
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--font-render-hinting=none' // lepsza jakość fontów w pdf
        ],
        // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined // Dla Alpine Docker
    });

    try {
        const page = await browser.newPage();
        await page.setContent(fullHtml, { waitUntil: 'networkidle0' }); // czeka na wczytanie fontów

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
