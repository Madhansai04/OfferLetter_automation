import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(here, '..', '..', 'public', 'offer-letter-template.pdf');

/**
 * Regression guard for the "root object is missing or invalid" bug.
 *
 * The template carries a stale generation-1 copy of object 1 (an artefact of
 * the incremental save that added its C2PA Content Credentials). pdf-lib's
 * xref writer only emits generation 0, so saving without normalising first
 * leaves /Root dangling. Lenient viewers rebuild the xref and look fine;
 * Adobe Acrobat refuses to open the file.
 */
describe('generated PDF structure', () => {
  const templateBytes = readFileSync(TEMPLATE);

  it('the template really does contain a non-zero-generation object', async () => {
    // If this ever fails the upstream template changed and the workaround
    // in pdfGenerator.js may no longer be needed.
    const doc = await PDFDocument.load(templateBytes);
    const generations = [];
    for (const [ref] of doc.context.enumerateIndirectObjects()) {
      if (ref.generationNumber !== 0) generations.push(ref.toString());
    }
    expect(generations).toContain('1 1 R');
  });

  it('saving without normalising produces a dangling /Root (the bug)', async () => {
    const doc = await PDFDocument.load(templateBytes);
    const saved = await doc.save({ useObjectStreams: false });
    const trailer = Buffer.from(saved).toString('latin1').match(/trailer[\s\S]{0,200}/)[0];
    // The root points at generation 1, which the xref never describes.
    expect(trailer).toMatch(/\/Root\s+1\s+1\s+R/);
  });

  it('normalising gives a generation-0 /Root that the xref describes', async () => {
    const doc = await PDFDocument.load(templateBytes);

    // Same normalisation pdfGenerator.js performs.
    const context = doc.context;
    const stale = [];
    for (const [ref] of context.enumerateIndirectObjects()) {
      if (ref.generationNumber !== 0) stale.push(ref);
    }
    const catalog = doc.catalog;
    for (const ref of stale) context.delete(ref);
    const catalogRef = context.nextRef();
    context.assign(catalogRef, catalog);
    context.trailerInfo.Root = catalogRef;

    await doc.embedFont(StandardFonts.Helvetica);
    const saved = await doc.save({ useObjectStreams: false });
    const text = Buffer.from(saved).toString('latin1');

    const rootMatch = text.match(/\/Root\s+(\d+)\s+(\d+)\s+R/);
    expect(rootMatch).not.toBeNull();
    const [, objNum, gen] = rootMatch;
    expect(gen).toBe('0');

    // The referenced object must actually exist in the body as a Catalog.
    const objRegex = new RegExp(`(^|[^0-9])${objNum} 0 obj([\\s\\S]{0,400})`);
    const body = text.match(objRegex);
    expect(body).not.toBeNull();
    expect(body[2]).toContain('/Type /Catalog');

    // And no indirect object may be emitted at a non-zero generation.
    expect(text).not.toMatch(/^\d+ [1-9]\d* obj/m);
  });
});
