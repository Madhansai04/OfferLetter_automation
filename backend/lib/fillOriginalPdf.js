import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(
  __dirname, '..', '..', 'docs', 'superpowers', 'specs', 'assets',
  'Ganit_Offer_Letter_Placeholder_Template.pdf'
);

const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.07, 0.07, 0.07);
const PAD = 2; // extra margin so the white cover fully hides original glyph edges

// Coordinates and widths measured directly from the original PDF's text
// layer (pdfjs-dist getTextContent), PDF points, origin bottom-left.
// `text` is what actually replaces the covered region.
function buildPage1Fields(v) {
  return [
    { x: 69, y: 634, width: 33.8, height: 8, size: 9, text: v.NAME },
    { x: 180, y: 631, width: 34.7, height: 8, size: 9, text: v.EMAIL },
    { x: 435, y: 631, width: 49.4, height: 8, size: 9, text: v.CONTACT },
    // "Dear {{NAME}}," is one text run — cover the whole run and redraw it whole.
    { x: 63.5, y: 582, width: 55.6, height: 8, size: 8, text: `Dear ${v.NAME},` },
    { x: 262, y: 535.5, width: 32.5, height: 8, size: 9, text: v.ROLE },
    { x: 190, y: 520.6, width: 104.6, height: 7, size: 9, text: `${v.CTC_NUM} (${v.CTC_WORDS})` },
    { x: 448.5, y: 520.6, width: 23.4, height: 7, size: 9, text: v.DOJ },
    { x: 72.5, y: 506.9, width: 32.1, height: 5.5, size: 8, text: v.POSTING }
  ];
}

function buildPage4Fields(v) {
  return [
    { x: 293.7, y: 696.0, width: 29.6, height: 7, size: 9, text: v.NAME },
    { x: 291.5, y: 680.7, width: 20.0, height: 6, size: 9, text: v.DOJ },
    { x: 293.7, y: 668.4, width: 28.4, height: 7, size: 9, text: v.ROLE },
    { x: 320.5, y: 638.4, width: 37.3, height: 6, size: 9, text: v.CTC_NUM },

    // Compensation table rows: the source PDF has no placeholder text in
    // these cells, only a bare ₹ symbol at x≈299.7 (monthly) / x≈414.8
    // (yearly). Values are drawn immediately to the right of each ₹.
    { x: 306, y: 584.4, width: 60, height: 10, size: 9, text: v.BASIC_PAY_M },
    { x: 421, y: 584.4, width: 60, height: 10, size: 9, text: v.BASIC_PAY_Y },
    { x: 306, y: 570.5, width: 60, height: 10, size: 9, text: v.HRA_M },
    { x: 421, y: 570.5, width: 60, height: 10, size: 9, text: v.HRA_Y },
    { x: 306, y: 556.8, width: 60, height: 10, size: 9, text: v.CONVEYANCE_M },
    { x: 421, y: 556.8, width: 60, height: 10, size: 9, text: v.CONVEYANCE_Y },
    { x: 306, y: 543.0, width: 60, height: 10, size: 9, text: v.TOTAL_FIXED_M },
    { x: 421, y: 543.0, width: 60, height: 10, size: 9, text: v.TOTAL_FIXED_Y },
    { x: 320.5, y: 513.5, width: 70, height: 10, size: 9, text: v.VARIABLE_PAY },
    { x: 306, y: 487.8, width: 60, height: 10, size: 9, text: v.PF_M },
    { x: 421, y: 487.8, width: 60, height: 10, size: 9, text: v.PF_Y },
    { x: 306, y: 473.9, width: 60, height: 10, size: 9, text: v.GRATUITY_M },
    { x: 421, y: 473.9, width: 60, height: 10, size: 9, text: v.GRATUITY_Y },
    { x: 306, y: 460.1, width: 60, height: 10, size: 9, text: v.TOTAL_BENEFIT_M },
    { x: 421, y: 460.1, width: 60, height: 10, size: 9, text: v.TOTAL_BENEFIT_Y },

    { x: 322.5, y: 334.5, width: 70, height: 9, size: 9, text: v.MEDICAL_INSURANCE },
    { x: 322.5, y: 319.5, width: 70, height: 9, size: 9, text: v.PERSONAL_ACCIDENT_INSURANCE },
    { x: 322.5, y: 304.5, width: 70, height: 9, size: 9, text: v.TERM_INSURANCE }
  ];
}

// Blank space between the table footnotes (y≈423) and the insurance
// intro line (y≈378) is where the optional retention/relocation lines go.
const RETENTION_LINE_Y = 405;
const RELOCATION_LINE_Y = 392;

function drawCoveredField(page, field, font) {
  page.drawRectangle({
    x: field.x - PAD,
    y: field.y - PAD,
    width: field.width + PAD * 2,
    height: field.height + PAD * 2,
    color: WHITE
  });
  page.drawText(field.text, {
    x: field.x,
    y: field.y,
    size: field.size,
    font,
    color: BLACK
  });
}

/**
 * Fills the real Ganit offer letter template PDF with computed values,
 * preserving the original file's exact design, logo, and layout.
 * Only the {{PLACEHOLDER}} regions are covered and replaced.
 */
export async function fillOriginalPdf(values, flags) {
  const templateBytes = await readFile(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page4 = pages[3];

  for (const field of buildPage1Fields(values)) {
    drawCoveredField(page1, field, font);
  }
  for (const field of buildPage4Fields(values)) {
    drawCoveredField(page4, field, font);
  }

  if (flags.RETENTION_PAY_LINE) {
    page4.drawText(`Retention Pay* (Yearly): Rs. ${values.RETENTION_PAY_AMOUNT}`, {
      x: 63.9, y: RETENTION_LINE_Y, size: 10, font, color: BLACK
    });
  }

  if (flags.RELOCATION_BONUS_LINE) {
    page4.drawText(`Relocation Bonus** (Yearly): Rs. ${values.RELOCATION_BONUS_AMOUNT}`, {
      x: 63.9, y: RELOCATION_LINE_Y, size: 10, font, color: BLACK
    });
  }

  if (flags.RETENTION_PAY_LINE || flags.RELOCATION_BONUS_LINE) {
    let footnoteY = 240;
    if (flags.RETENTION_PAY_LINE) {
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
    if (flags.RELOCATION_BONUS_LINE) {
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
  return Buffer.from(pdfBytes);
}
