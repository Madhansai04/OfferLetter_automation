import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { formatNumber, formatDateSlashes, formatDateLong, numberToWords } from './formatters';

const TEMPLATE_URL = '/offer-letter-template.docx';
const DOCUMENT_PART = 'word/document.xml';

/**
 * Word stores a run of text as <w:t>...</w:t>, but it may split a single
 * visible string across several runs (spell-check state, formatting, revision
 * marks). "{name}" can therefore live in the file as "{na" + "me}", so a
 * naive search for "{name}" misses it.
 *
 * Each paragraph's runs are merged into the first one before substitution so
 * placeholders are always contiguous. Formatting is taken from the first run,
 * which is what the placeholder itself was styled with.
 */
function mergeRunsWithinParagraphs(xml) {
  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => {
    const textNodes = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)];
    if (textNodes.length < 2) return paragraph;

    const combined = textNodes.map((m) => m[1]).join('');
    if (!combined.includes('{')) return paragraph;

    let isFirst = true;
    return paragraph.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, () => {
      if (isFirst) {
        isFirst = false;
        return `<w:t xml:space="preserve">${combined}</w:t>`;
      }
      return '<w:t xml:space="preserve"></w:t>';
    });
  });
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Replaces the named {placeholder} tokens the template uses. The template is
 * inconsistent about case ({Name} in the header table, {name} in Annexure 2),
 * so matching ignores case.
 */
function fillNamedPlaceholders(xml, values) {
  let output = xml;
  for (const [token, value] of Object.entries(values)) {
    const pattern = new RegExp(`\\{\\s*${token}\\s*\\}`, 'gi');
    output = output.replace(pattern, escapeXml(value));
  }
  return output;
}

/**
 * The compensation table uses bare "{}" placeholders that carry no name, so
 * they can only be identified by where they sit in the table. They are filled
 * in document order, which for the template's Annexure 2 table is:
 *
 *   CTC, Basic m/y, HRA m/y, Conveyance m/y, Total Fixed m/y,
 *   Variable, PF m/y, Gratuity m/y, Total Benefit m/y
 *
 * If a row is ever added, removed or reordered in the .docx, this list must
 * be updated to match.
 */
function fillPositionalPlaceholders(xml, orderedValues) {
  let index = 0;
  return xml.replace(/\{\s*\}/g, () => {
    const value = orderedValues[index];
    index += 1;
    return value === undefined ? '' : escapeXml(value);
  });
}

/**
 * The insurance table has no placeholders — each coverage cell contains only
 * "/-". The three amounts are inserted before that suffix, in table order:
 * Medical, Personal Accident, Term.
 */
function fillInsuranceAmounts(xml, amounts) {
  let index = 0;
  return xml.replace(/<w:t(?:\s[^>]*)?>\s*\/-\s*<\/w:t>/g, () => {
    const amount = amounts[index];
    index += 1;
    if (amount === undefined) return '<w:t xml:space="preserve">/-</w:t>';
    return `<w:t xml:space="preserve">${escapeXml(amount)}/-</w:t>`;
  });
}

/**
 * Replaces the hardcoded posting city in the offer sentence.
 *
 * After runs are merged the sentence sits in one <w:t>, so the city is matched
 * within the run that follows "join Ganit on". If the template's wording ever
 * changes so the anchor no longer matches, the sentence is left untouched
 * rather than risking a wrong substitution elsewhere.
 */
function replacePostingCity(xml, city) {
  const posting = String(city || '').trim();
  if (!posting) return xml;

  return xml.replace(
    /(join\s+Ganit\s+on\b[\s\S]{0,200}?\bat\s+)Chennai\b/,
    (_match, before) => `${before}${escapeXml(posting)}`
  );
}

/**
 * Fills the Ganit offer letter Word template with the form's values.
 *
 * The template's own .docx is downloaded, its document part rewritten, and the
 * package zipped back up. Headers, footers, images, fonts, styles and page
 * layout are carried through untouched, because the original file is edited
 * rather than a new document being built.
 */
export async function generateOfferDocx(formData, breakdown) {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(`Could not load the Word template (HTTP ${response.status})`);
  }
  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));

  const documentPart = archive[DOCUMENT_PART];
  if (!documentPart) {
    throw new Error('The Word template is missing its word/document.xml part');
  }

  const today = new Date();
  const ctcAmount = formData.ctc * 100000;

  let xml = mergeRunsWithinParagraphs(strFromU8(documentPart));

  // Annexure 2's "Date of Joining" row uses {date}, the same token the page-1
  // header uses for the offer date. Fill this one first, matching on the
  // "Joining" run that immediately precedes it, so the generic {date}
  // replacement below does not put today's date in the joining-date cell.
  xml = xml.replace(
    /(Joining<\/w:t>[\s\S]{0,1200}?<w:t(?:\s[^>]*)?>)\{\s*date\s*\}(<\/w:t>)/,
    (_match, before, after) => `${before}${escapeXml(formatDateLong(formData.doj))}${after}`
  );

  xml = fillNamedPlaceholders(xml, {
    year: today.getFullYear(),
    date: formatDateSlashes(today),
    Name: formData.name,
    name: formData.name,
    email: formData.email,
    contact_no: formData.phone,
    role: formData.role,
    ctc: formatNumber(ctcAmount),
    'in words': numberToWords(Math.floor(ctcAmount)),
    'date of joinig': formatDateLong(formData.doj),
    'date of joining': formatDateLong(formData.doj)
  });

  // The template hardcodes the posting city as "Chennai" in the offer
  // sentence ("You will join Ganit on {date of joinig} at Chennai and your
  // position is ..."). Swap it for the city entered on the form.
  //
  // The word also appears twice in the letterhead address, but that lives in
  // word/header1.xml which is copied through untouched, so only the posting
  // reference is affected. The match is still anchored to the sentence to
  // keep it unambiguous.
  xml = replacePostingCity(xml, formData.posting);

  xml = fillPositionalPlaceholders(xml, [
    formatNumber(ctcAmount),
    formatNumber(breakdown.fixed.basic.monthly),
    formatNumber(breakdown.fixed.basic.yearly),
    formatNumber(breakdown.fixed.hra.monthly),
    formatNumber(breakdown.fixed.hra.yearly),
    formatNumber(breakdown.fixed.conveyance.monthly),
    formatNumber(breakdown.fixed.conveyance.yearly),
    formatNumber(breakdown.fixed.total.monthly),
    formatNumber(breakdown.fixed.total.yearly),
    formatNumber(breakdown.variable.yearly),
    formatNumber(breakdown.statutory.pf.monthly),
    formatNumber(breakdown.statutory.pf.yearly),
    formatNumber(breakdown.statutory.gratuity.monthly),
    formatNumber(breakdown.statutory.gratuity.yearly),
    formatNumber(breakdown.statutory.total.monthly),
    formatNumber(breakdown.statutory.total.yearly)
  ]);

  xml = fillInsuranceAmounts(xml, [
    formatNumber(breakdown.insurance.medical),
    formatNumber(breakdown.insurance.personalAccident),
    formatNumber(breakdown.insurance.term)
  ]);

  archive[DOCUMENT_PART] = strToU8(xml);

  const blob = new Blob([zipSync(archive)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `offer-letter-${formData.name.replace(/\s+/g, '-')}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}
