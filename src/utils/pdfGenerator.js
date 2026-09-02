import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formatNumber, formatDate, numberToWords } from './formatters';

const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.07, 0.07, 0.07);
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
  return [
    { x: 69, y: 634, width: 33.8, height: 8, maxSize: 9, minSize: 6, text: v.name },
    { x: 180, y: 631, width: 34.7, height: 8, maxSize: 9, minSize: 6, text: v.email },
    { x: 435, y: 631, width: 49.4, height: 8, maxSize: 9, minSize: 6, text: v.phone },
    // "Dear {{NAME}}," is a single text run in the source PDF — cover
    // the whole run and redraw the whole line (not just the name part).
    { x: 63.5, y: 582, width: 300, height: 8, maxSize: 8, minSize: 6, text: `Dear ${v.name},` },
    { x: 262, y: 535.5, width: 60, height: 8, maxSize: 9, minSize: 6, text: v.role },
    { x: 190, y: 520.6, width: 175, height: 7, maxSize: 9, minSize: 5.5, text: `${formatNumber(v.ctc * 100000)} (${numberToWords(Math.floor(v.ctc * 100000))})` },
    { x: 448.5, y: 520.6, width: 60, height: 7, maxSize: 9, minSize: 6, text: formatDate(v.doj) },
    { x: 72.5, y: 506.9, width: 60, height: 5.5, maxSize: 8, minSize: 5.5, text: v.posting }
  ];
}

function buildPage4Fields(v, breakdown) {
  const b = breakdown;
  return [
    { x: 293.7, y: 696.0, width: 100, height: 7, maxSize: 9, minSize: 6, text: v.name },
    { x: 291.5, y: 680.7, width: 70, height: 6, maxSize: 9, minSize: 6, text: formatDate(v.doj) },
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
    { x: 306, y: 460.1, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.fixed.total.monthly + b.statutory.pf.monthly + b.statutory.gratuity.monthly) },
    { x: 421, y: 460.1, width: 60, height: 10, maxSize: 9, minSize: 6, text: formatNumber(b.fixed.total.yearly + b.statutory.pf.yearly + b.statutory.gratuity.yearly) },

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
  page.drawText(field.text, { x: field.x, y: field.y, size, font, color: BLACK });
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
