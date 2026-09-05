import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import {
  formatNumber, formatDateSlashes, formatDateLong, formatDateLongHyphen,
  numberToWordsTitleCase
} from './formatters';
import { downloadBlob } from './downloadBlob';

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

    // Only collapse the paragraph when a placeholder is actually split across
    // runs. Merging unconditionally would flatten every run in the paragraph
    // into one, throwing away the per-run formatting the template applies to
    // individual words.
    const hasSplitPlaceholder = /\{[^}]*$/.test(textNodes[0][1])
      || textNodes.some((m, i) => i > 0 && /^[^{]*\}/.test(m[1]) && !m[1].includes('{'))
      || (combined.includes('{') && !textNodes.some((m) => /\{[^}]*\}/.test(m[1])));
    if (!hasSplitPlaceholder) return paragraph;

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
 * Splits a merged run so the given substrings can be set in bold while the
 * text around them stays plain.
 *
 * Filling the offer sentence requires merging its runs, because the template
 * splits {ctc} and {date of joinig} across several. That merge flattens the
 * whole sentence to one style, losing the emphasis the letter is written with.
 * This puts it back: the run is broken into alternating plain and bold runs,
 * so the values stand out exactly as in the signed-off wording.
 *
 * `segments` are matched longest-first so that a value contained inside
 * another (a city that also appears in a role title, say) cannot split its
 * container.
 */
function emphasiseWithinRun(run, segments) {
  const textMatch = run.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/);
  if (!textMatch) return run;

  const fullText = textMatch[1];
  const wanted = segments
    .filter((s) => s.text && String(s.text).trim().length > 0)
    .map((s) => ({ ...s, text: escapeXml(String(s.text).trim()) }))
    .sort((a, b) => b.text.length - a.text.length);
  if (wanted.length === 0) return run;

  const baseProps = (run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];

  // Walk the text, carving out each wanted segment as its own run.
  const pieces = [];
  let cursor = 0;
  while (cursor < fullText.length) {
    let hit = null;
    for (const segment of wanted) {
      const at = fullText.indexOf(segment.text, cursor);
      if (at !== -1 && (hit === null || at < hit.at)) hit = { at, segment };
    }
    if (!hit) {
      pieces.push({ text: fullText.slice(cursor), emphasis: null });
      break;
    }
    if (hit.at > cursor) {
      pieces.push({ text: fullText.slice(cursor, hit.at), emphasis: null });
    }
    pieces.push({ text: hit.segment.text, emphasis: hit.segment });
    cursor = hit.at + hit.segment.text.length;
  }
  if (pieces.length < 2) return run;

  return pieces
    .filter((piece) => piece.text.length > 0)
    .map((piece) => {
      if (!piece.emphasis) {
        return `<w:r>${baseProps}<w:t xml:space="preserve">${piece.text}</w:t></w:r>`;
      }
      const props = baseProps
        ? baseProps.replace('</w:rPr>', '<w:b/></w:rPr>')
        : '<w:rPr><w:b/></w:rPr>';
      return `<w:r>${props}<w:t xml:space="preserve">${piece.text}</w:t></w:r>`;
    })
    .join('');
}

/**
 * Restores the offer sentence's emphasis after its runs have been merged.
 *
 * The sentence reads, with the emphasised parts in bold:
 *
 *   We are pleased to offer you a full-time role as **Data Analyst** at Ganit
 *   Business Solutions Pvt. Ltd. Your potential annual Compensation of
 *   **INR 5,00,000/- (Rupees Five Lakh Only).** You will join Ganit on
 *   **02 September 2026** at **Chennai** and your position is work from client
 *   office and or Ganit office and not remote.
 *
 * Note the compensation phrase is emphasised as a whole — "INR", the "/-" and
 * the bracketed words in it are bold too, not just the figure.
 */
function restoreOfferSentenceEmphasis(xml, { role, compensationPhrase, joiningDate, city }) {
  return xml.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (run) => {
    const text = (run.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/) || [])[1];
    if (text === undefined || !text.includes('pleased to offer')) return run;

    return emphasiseWithinRun(run, [
      { text: role },
      { text: compensationPhrase },
      { text: joiningDate },
      { text: city }
    ]);
  });
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
  // Annexure 2 uses the hyphenated form (03-September-2026); page 1's offer
  // sentence keeps the spaced form.
  xml = xml.replace(
    /(Joining<\/w:t>[\s\S]{0,1200}?<w:t(?:\s[^>]*)?>)\{\s*date\s*\}(<\/w:t>)/,
    (_match, before, after) => `${before}${escapeXml(formatDateLongHyphen(formData.doj))}${after}`
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
    'in words': numberToWordsTitleCase(Math.floor(ctcAmount)),
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

  // Filling the offer sentence required merging its runs, which flattened its
  // styling. Put the emphasis back.
  xml = restoreOfferSentenceEmphasis(xml, {
    role: formData.role,
    compensationPhrase: `INR ${formatNumber(ctcAmount)}/- (Rupees ${numberToWordsTitleCase(Math.floor(ctcAmount))} Only).`,
    joiningDate: formatDateLong(formData.doj),
    city: String(formData.posting || '').trim()
  });

  archive[DOCUMENT_PART] = strToU8(xml);

  const blob = new Blob([zipSync(archive)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  downloadBlob(blob, `offer-letter-${formData.name.replace(/\s+/g, '-')}.docx`);
}
