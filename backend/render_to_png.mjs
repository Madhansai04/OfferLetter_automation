import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { readFile, writeFile } from 'node:fs/promises';

const pdfPath = process.argv[2];
const outPath = process.argv[3];
const pageNum = parseInt(process.argv[4] || '1', 10);

const data = new Uint8Array(await readFile(pdfPath));
const doc = await getDocument({ data }).promise;
const page = await doc.getPage(pageNum);
const viewport = page.getViewport({ scale: 2 });

const canvas = createCanvas(viewport.width, viewport.height);
const ctx = canvas.getContext('2d');

await page.render({ canvasContext: ctx, viewport }).promise;

const buffer = await canvas.encode('png');
await writeFile(outPath, buffer);
console.log('Saved page', pageNum, 'to', outPath);
