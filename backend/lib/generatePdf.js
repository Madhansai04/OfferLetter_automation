import puppeteer from 'puppeteer';

/**
 * Renders an HTML string to a PDF buffer using a headless Chromium instance.
 * A fresh browser is launched per call — acceptable for the MVP's
 * single-user, low-volume usage pattern.
 */
export async function generatePdf(html) {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });
    return Buffer.from(pdfData);
  } finally {
    await browser.close();
  }
}
