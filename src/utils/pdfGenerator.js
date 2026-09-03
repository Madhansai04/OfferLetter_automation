import {
  PDFDocument, StandardFonts, rgb,
  PDFRawStream, PDFDict, PDFName, decodePDFRawStream
} from 'pdf-lib';
import { formatNumber, formatDateSlashes, formatDateLong, numberToWords } from './formatters';

const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.07, 0.07, 0.07);
// The template prints the Ref and Date header line in grey (#a6a6a6);
// redrawing them in black would stand out against the untouched design.
const HEADER_GREY = rgb(0xa6 / 255, 0xa6 / 255, 0xa6 / 255);
const PAD = 2; // extra margin so the white cover fully hides the original glyph edges

/**
 * Coordinates and widths below were measured directly from the real
 * template PDF's text layer (pdfjs-dist getTextContent), in PDF points,
 * origin bottom-left. Each entry covers the original {{PLACEHOLDER}}
 * region with a white rectangle, then draws the real value in its place.
 * `maxSize`/`minSize` let long values auto-shrink to fit the original
 * space instead of overlapping neighboring static text.
 */
function buildPage1Fields(v) {
  const today = new Date();
  return [
    // "Ref: GANIT/HR/APPT/2026" and "Date: 25/08/2026" are baked into the
    // template as single grey text runs, including their labels. Cover each
    // whole run and redraw it with a live year and today's date.
    {
      x: 63.86, y: 676.42, width: 138.73, height: 12,
      maxSize: 12, minSize: 8, color: HEADER_GREY,
      text: `Ref: GANIT/HR/APPT/${today.getFullYear()}`
    },
    {
      x: 441.46, y: 676.42, width: 88.07, height: 12,
      maxSize: 12, minSize: 8, color: HEADER_GREY,
      text: `Date: ${formatDateSlashes(today)}`
    },
    { x: 69, y: 634, width: 33.8, height: 8, maxSize: 9, minSize: 6, text: v.name },
    { x: 180, y: 631, width: 34.7, height: 8, maxSize: 9, minSize: 6, text: v.email },
    { x: 435, y: 631, width: 49.4, height: 8, maxSize: 9, minSize: 6, text: v.phone },
    // "Dear {{NAME}}," is a single text run in the source PDF — cover
    // the whole run and redraw the whole line (not just the name part).
    { x: 63.5, y: 582, width: 300, height: 8, maxSize: 8, minSize: 6, text: `Dear ${v.name},` },
    { x: 262, y: 535.5, width: 60, height: 8, maxSize: 9, minSize: 6, text: v.role },
    { x: 190, y: 520.6, width: 175, height: 7, maxSize: 9, minSize: 5.5, text: `${formatNumber(v.ctc * 100000)} (${numberToWords(Math.floor(v.ctc * 100000))})` },
    // {{DOJ}} is the last item on its line, so it can run to the right
    // margin (~538pt) — enough for the long "03 September 2026" form.
    { x: 448.5, y: 520.6, width: 88, height: 7, maxSize: 9, minSize: 6, text: formatDateLong(v.doj) },
    { x: 72.5, y: 506.9, width: 60, height: 5.5, maxSize: 8, minSize: 5.5, text: v.posting }
  ];
}

function buildPage4Fields(v, breakdown) {
  const b = breakdown;
  return [
    { x: 293.7, y: 696.0, width: 100, height: 7, maxSize: 9, minSize: 6, text: v.name },
    { x: 291.5, y: 680.7, width: 100, height: 6, maxSize: 9, minSize: 6, text: formatDateLong(v.doj) },
    { x: 293.7, y: 668.4, width: 100, height: 7, maxSize: 9, minSize: 6, text: v.role },
    { x: 320.5, y: 638.4, width: 90, height: 6, maxSize: 9, minSize: 6, text: formatNumber(v.ctc * 100000) },

    // Compensation table rows: the source PDF has no placeholder text
    // in these cells, only a bare ₹ symbol at x≈299.7 (monthly) and
    // x≈414.8 (yearly). Values are drawn to the right of each ₹.
    { x: 306, y: 584.4, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.fixed.basic.monthly) },
    { x: 421, y: 584.4, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.fixed.basic.yearly) },
    { x: 306, y: 570.5, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.fixed.hra.monthly) },
    { x: 421, y: 570.5, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.fixed.hra.yearly) },
    { x: 306, y: 556.8, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.fixed.conveyance.monthly) },
    { x: 421, y: 556.8, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.fixed.conveyance.yearly) },
    { x: 306, y: 543.0, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.fixed.total.monthly) },
    { x: 421, y: 543.0, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.fixed.total.yearly) },
    { x: 320.5, y: 513.5, width: 70, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.variable.yearly) },
    { x: 306, y: 487.8, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.statutory.pf.monthly) },
    { x: 421, y: 487.8, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.statutory.pf.yearly) },
    { x: 306, y: 473.9, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.statutory.gratuity.monthly) },
    { x: 421, y: 473.9, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.statutory.gratuity.yearly) },
    // Total Benefit Component = PF + Gratuity only (Annexure 2 grouping)
    { x: 306, y: 460.1, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.statutory.total.monthly) },
    { x: 421, y: 460.1, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.statutory.total.yearly) },

    { x: 322.5, y: 334.5, width: 70, height: 9, maxSize: 9, minSize: 6, text: formatNumber(b.insurance.medical) },
    { x: 322.5, y: 319.5, width: 70, height: 9, maxSize: 9, minSize: 6, text: formatNumber(b.insurance.personalAccident) },
    { x: 322.5, y: 304.5, width: 70, height: 9, maxSize: 9, minSize: 6, text: formatNumber(b.insurance.term) }
  ];
}

// Blank space between the table footnotes (y≈423) and the insurance
// intro line (y≈378) is where the optional retention/relocation lines go.
const RETENTION_LINE_Y = 405;
const RELOCATION_LINE_Y = 392;

function fitFontSize(font, text, maxWidth, maxSize, minSize) {
  let size = maxSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return size;
}

function drawCoveredField(page, field, font) {
  page.drawRectangle({
    x: field.x - PAD,
    y: field.y - PAD,
    width: field.width + PAD * 2,
    height: field.height + PAD * 2,
    color: WHITE
  });
  const size = fitFontSize(font, field.text, field.width, field.maxSize, field.minSize);
  page.drawText(field.text, {
    x: field.x,
    y: field.y,
    size,
    font,
    color: field.color ?? BLACK
  });
}

/** Decodes a PDF hex string like <7b7b524f4c457d7d> to its characters. */
function decodeHexString(hex) {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  let out = '';
  for (let i = 0; i + 1 < clean.length; i += 2) {
    out += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
  }
  return out;
}

/**
 * Page-1 baseline of the "Ref: ... / Date: ..." header, which is drawn over
 * with a live reference number and today's date. The template splits that
 * line across dozens of text operators ("[(Ref)4(:)]TJ", "[(G)6(A)5(N)...]TJ"),
 * so it cannot be matched by phrase — every text operator positioned on this
 * baseline is removed instead.
 */
const REPLACED_HEADER_BASELINE_Y = 676.42;
const BASELINE_TOLERANCE = 1.5;

/**
 * Deletes the template's {{PLACEHOLDER}} text from its content streams.
 *
 * Drawing a white rectangle over a placeholder hides it visually but leaves
 * the characters in the PDF's text layer, so copying text out of the letter,
 * reading it with a screen reader, or converting it to Word all surface the
 * old tokens interleaved with the real values ("{J{aNnAeMDEo}e}").
 *
 * The placeholders appear in two encodings: most as literal strings such as
 * "[({{NAME}})]TJ", and {{ROLE}} and {{POSTING}} as hex strings such as
 * "[<7b7b524f4c457d7d>]TJ". Both forms are emptied here, keeping the text
 * operator itself so the surrounding positioning and graphics state stay
 * valid.
 *
 * Streams are written back uncompressed, which avoids pulling in a deflate
 * dependency. That costs roughly 70KB per generated letter.
 */
function stripPlaceholderText(pdfDoc) {
  const context = pdfDoc.context;

  for (const page of pdfDoc.getPages()) {
    const contents = page.node.Contents();
    if (!contents) continue;

    const refs = [];
    if (contents.constructor?.name === 'PDFArray') {
      for (let i = 0; i < contents.size(); i++) refs.push(contents.get(i));
    } else {
      refs.push(contents);
    }

    for (const ref of refs) {
      const stream = context.lookup(ref);
      if (!stream || stream.constructor?.name !== 'PDFRawStream') continue;

      let source;
      try {
        source = decodePDFRawStream(stream).decode();
      } catch {
        continue; // unreadable stream — leave it untouched
      }

      const original = Array.from(source, (b) => String.fromCharCode(b)).join('');
      const isPage1 = page === pdfDoc.getPages()[0];

      // Walk the stream tracking the current text-matrix baseline, so text can
      // be removed either by its content (placeholders) or by its position
      // (the header line, which is split across too many operators to match).
      let currentY = null;
      const rewritten = original.replace(
        /(?:[\d.-]+\s+){4}([\d.-]+)\s+([\d.-]+)\s+Tm|\[[^\]]*\]\s*TJ|\([^)]*\)\s*Tj/g,
        (op, _tmX, tmY) => {
          if (tmY !== undefined) {
            currentY = parseFloat(tmY);
            return op;
          }

          const onReplacedHeader =
            isPage1 &&
            currentY !== null &&
            Math.abs(currentY - REPLACED_HEADER_BASELINE_Y) < BASELINE_TOLERANCE;

          const hexStrings = op.match(/<[0-9A-Fa-f\s]+>/g);
          if (hexStrings) {
            const hasPlaceholder = hexStrings.some((h) => /[{}]/.test(decodeHexString(h)));
            return hasPlaceholder || onReplacedHeader ? '[<>]TJ' : op;
          }
          return /[{}]/.test(op) || onReplacedHeader ? '[()]TJ' : op;
        }
      );
      if (rewritten === original) continue;

      const bytes = Uint8Array.from(rewritten, (c) => c.charCodeAt(0) & 0xff);
      context.assign(
        ref,
        PDFRawStream.of(
          PDFDict.fromMapWithContext(
            new Map([[PDFName.of('Length'), context.obj(bytes.length)]]),
            context
          ),
          bytes
        )
      );
    }
  }
}

/**
 * Works around a pdf-lib incompatibility with the template PDF.
 *
 * The template was saved as an incremental update (it carries Adobe C2PA
 * "Content Credentials"), which left object 1 present twice: once at
 * generation 0 and once at generation 1, with the trailer's /Root pointing
 * at "1 1 R". pdf-lib's cross-reference writer emits a single slot per
 * object number and always writes generation 0, so on save the /Root
 * reference no longer resolves. Lenient viewers silently rebuild the xref
 * and appear fine; strict readers such as Adobe Acrobat reject the file
 * with "The root object is missing or invalid."
 *
 * Dropping the stale non-zero-generation objects and re-registering the
 * catalog under a fresh generation-0 reference produces a file that parses
 * cleanly without any xref reconstruction.
 */
function normalizeObjectGenerations(pdfDoc) {
  const context = pdfDoc.context;

  const staleRefs = [];
  for (const [ref] of context.enumerateIndirectObjects()) {
    if (ref.generationNumber !== 0) staleRefs.push(ref);
  }
  if (staleRefs.length === 0) return;

  const catalog = pdfDoc.catalog;
  for (const ref of staleRefs) context.delete(ref);

  const catalogRef = context.nextRef();
  context.assign(catalogRef, catalog);
  context.trailerInfo.Root = catalogRef;
}

/**
 * Fills the real Ganit offer letter template PDF with the form's values,
 * preserving the original file's exact design, logo, and layout, and
 * triggers a browser download. Runs entirely client-side.
 */
export async function generateOfferPDF(formData, breakdown) {
  const templateUrl = '/offer-letter-template.pdf';
  const templateBytes = await fetch(templateUrl).then((res) => res.arrayBuffer());

  const pdfDoc = await PDFDocument.load(templateBytes);
  stripPlaceholderText(pdfDoc);
  normalizeObjectGenerations(pdfDoc);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page4 = pages[3];

  for (const field of buildPage1Fields(formData)) {
    drawCoveredField(page1, field, font);
  }
  for (const field of buildPage4Fields(formData, breakdown)) {
    drawCoveredField(page4, field, font);
  }

  if (breakdown.optional.retention.show) {
    page4.drawText(
      `Retention Pay* (Yearly): Rs. ${formatNumber(breakdown.optional.retention.yearly)}`,
      { x: 63.9, y: RETENTION_LINE_Y, size: 10, font, color: BLACK }
    );
  }

  if (breakdown.optional.relocation.show) {
    page4.drawText(
      `Relocation Bonus** (Yearly): Rs. ${formatNumber(breakdown.optional.relocation.yearly)}`,
      { x: 63.9, y: RELOCATION_LINE_Y, size: 10, font, color: BLACK }
    );
  }

  if (breakdown.optional.retention.show || breakdown.optional.relocation.show) {
    let footnoteY = 240;
    if (breakdown.optional.retention.show) {
      page4.drawText(
        '* Retention pay will be prorated & paid during June & December payroll. Any payout must be',
        { x: 63.9, y: footnoteY, size: 7.5, font, color: BLACK }
      );
      footnoteY -= 9;
      page4.drawText(
        'reimbursed if you resign within 12 months from the date of joining.',
        { x: 68, y: footnoteY, size: 7.5, font, color: BLACK }
      );
      footnoteY -= 14;
    }
    if (breakdown.optional.relocation.show) {
      page4.drawText(
        '** Relocation bonus will be paid during the subsequent payroll after employees complete 1',
        { x: 63.9, y: footnoteY, size: 7.5, font, color: BLACK }
      );
      footnoteY -= 9;
      page4.drawText(
        'month from date of joining and will be recovered if you resign within 12 months from DOJ.',
        { x: 68, y: footnoteY, size: 7.5, font, color: BLACK }
      );
    }
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `offer-letter-${formData.name.replace(/\s+/g, '-')}.pdf`;
  link.click();

  URL.revokeObjectURL(url);
}
