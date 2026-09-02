import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile } from 'node:fs/promises';

const path = process.argv[2];
const pageNum = parseInt(process.argv[3], 10);
const data = new Uint8Array(await readFile(path));
const doc = await getDocument({ data }).promise;
const page = await doc.getPage(pageNum);
const content = await page.getTextContent();

for (const item of content.items) {
  if (item.str.includes('{{') || item.str.includes('}}') || item.str.includes('Dear') || item.str.includes('role as') || item.str.includes('t Ganit')) {
    const tx = item.transform;
    console.log(JSON.stringify({
      str: item.str,
      x: tx[4],
      y: tx[5],
      width: item.width,
      height: item.height,
      fontName: item.fontName
    }));
  }
}
