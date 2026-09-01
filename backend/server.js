import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';
import { OfferLetterInputSchema } from './lib/validate.js';
import { buildOfferData } from './lib/buildOfferData.js';
import { renderTemplate } from './lib/renderTemplate.js';
import { generatePdf } from './lib/generatePdf.js';
import { generateDocx } from './lib/generateDocx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();
app.use(express.json());

app.post('/api/preview', (req, res) => {
  const parsed = OfferLetterInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  const { values, flags } = buildOfferData(parsed.data);
  res.json({ values, flags });
});

app.post('/api/generate', async (req, res) => {
  const parsed = OfferLetterInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  try {
    const { values, flags } = buildOfferData(parsed.data);
    const templatePath = path.join(__dirname, 'templates', 'offer-letter.html');
    const templateHtml = await fs.readFile(templatePath, 'utf-8');
    const filledHtml = renderTemplate(templateHtml, values, flags);

    const [pdfBuffer, docxBuffer] = await Promise.all([
      generatePdf(filledHtml),
      generateDocx(values, flags)
    ]);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="offer-letter.zip"');

    const archive = archiver('zip');
    archive.pipe(res);
    archive.append(pdfBuffer, { name: 'offer-letter.pdf' });
    archive.append(docxBuffer, { name: 'offer-letter.docx' });
    await archive.finalize();
  } catch (error) {
    console.error('Document generation failed:', error);
    res.status(500).json({ error: 'Document generation failed' });
  }
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Offer letter backend listening on port ${PORT}`);
  });
}
